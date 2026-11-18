import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (clientId) {
      this.googleClient = new OAuth2Client(clientId);
    }
  }

  isGoogleAuthEnabled(): boolean {
    return !!this.configService.get<string>('GOOGLE_CLIENT_ID');
  }

  getGoogleClientId(): string | null {
    return this.configService.get<string>('GOOGLE_CLIENT_ID') || null;
  }

  async register(dto: RegisterDto, ipAddress?: string): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTER',
        resource: 'User',
        resourceId: user.id,
        ipAddress,
      },
    });

    return this.generateTokens(user.id, user.email, user.role, ipAddress);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<{ user: any; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Continue with Google instead.',
      );
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSession(user, 'USER_LOGIN', ipAddress, userAgent);
  }

  /**
   * Verify a Google ID token (GIS), then create or link a local user and issue JWTs.
   * Safe defaults: requires email_verified, never elevates role, feature-gated by GOOGLE_CLIENT_ID.
   */
  async loginWithGoogle(
    idToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: any; tokens: AuthTokens }> {
    if (!this.googleClient) {
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }

    const clientId = this.getGoogleClientId();
    let payload: {
      sub?: string;
      email?: string;
      email_verified?: boolean | string;
      given_name?: string;
      family_name?: string;
      name?: string;
      picture?: string;
      aud?: string | string[];
      iss?: string;
    };

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: clientId!,
      });
      payload = ticket.getPayload() || {};
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

    if (!googleId || !email) {
      throw new UnauthorizedException('Google account is missing required identity claims');
    }
    if (!emailVerified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const iss = payload.iss;
    if (iss !== 'https://accounts.google.com' && iss !== 'accounts.google.com') {
      throw new UnauthorizedException('Invalid Google token issuer');
    }

    let user = await this.prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        // Link Google to an existing local account with the same verified email.
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId,
            authProvider: byEmail.passwordHash ? byEmail.authProvider : AuthProvider.GOOGLE,
            avatarUrl: byEmail.avatarUrl || payload.picture || null,
          },
        });
      } else {
        const nameParts = (payload.name || '').trim().split(/\s+/).filter(Boolean);
        const firstName = payload.given_name || nameParts[0] || 'Google';
        const lastName =
          payload.family_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User');

        user = await this.prisma.user.create({
          data: {
            email,
            googleId,
            firstName,
            lastName,
            avatarUrl: payload.picture || null,
            authProvider: AuthProvider.GOOGLE,
            passwordHash: null,
            // Always VIEWER — never elevate via OAuth.
          },
        });

        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'USER_REGISTER_GOOGLE',
            resource: 'User',
            resourceId: user.id,
            ipAddress,
            userAgent,
          },
        });
      }
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.issueSession(user, 'USER_LOGIN_GOOGLE', ipAddress, userAgent);
  }

  private async issueSession(
    user: {
      id: string;
      email: string;
      role: string;
      passwordHash?: string | null;
      [key: string]: unknown;
    },
    action: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: any; tokens: AuthTokens }> {
    await this.usersService.updateLastLogin(user.id);

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        resource: 'User',
        resourceId: user.id,
        ipAddress,
        userAgent,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role, ipAddress, userAgent);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  }

  async refreshTokens(refreshToken: string, ipAddress?: string): Promise<AuthTokens> {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Find valid token for this user
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
    });

    // Verify one of the stored tokens matches
    let validToken = null;
    for (const stored of storedTokens) {
      const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
      if (matches) {
        validToken = stored;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Refresh token not found or revoked');
    }

    // Revoke used token
    await this.prisma.refreshToken.update({
      where: { id: validToken.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return this.generateTokens(user.id, user.email, user.role, ipAddress);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const storedTokens = await this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
      });

      for (const stored of storedTokens) {
        const matches = await bcrypt.compare(refreshToken, stored.tokenHash);
        if (matches) {
          await this.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: new Date() },
          });
          break;
        }
      }
    } else {
      // Revoke all refresh tokens for the user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_LOGOUT',
        resource: 'User',
        resourceId: userId,
      },
    });
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, email, role };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    // Store hashed refresh token
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresMs = this.parseDuration(refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + expiresMs),
        ipAddress,
        userAgent,
      },
    });

    // Clean up expired tokens
    await this.prisma.refreshToken.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });

    const accessMs = this.parseDuration(accessExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(accessMs / 1000),
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] || 60000);
  }
}
