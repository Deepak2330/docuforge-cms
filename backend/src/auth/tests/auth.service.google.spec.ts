import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../../users/users.service';

jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  const OAuth2Client = jest.fn().mockImplementation(() => ({ verifyIdToken }));
  return { OAuth2Client, __mockVerifyIdToken: verifyIdToken };
});

const { __mockVerifyIdToken: mockVerifyIdToken } = jest.requireMock('google-auth-library') as {
  __mockVerifyIdToken: jest.Mock;
};

describe('AuthService Google sign-in', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-chars!!',
        JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-chars!',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
        GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
      };
      return config[key];
    }),
  };

  const googleUser = {
    id: 'google-user-1',
    email: 'alice@gmail.com',
    passwordHash: null,
    firstName: 'Alice',
    lastName: 'Google',
    role: 'VIEWER',
    isActive: true,
    avatarUrl: 'https://lh3.googleusercontent.com/a/x',
    authProvider: 'GOOGLE',
    googleId: 'google-sub-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (OAuth2Client as unknown as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('reports google auth enabled when client id is set', () => {
    expect(service.isGoogleAuthEnabled()).toBe(true);
    expect(service.getGoogleClientId()).toContain('googleusercontent.com');
  });

  it('rejects loginWithGoogle when Google is not configured', async () => {
    const disabledConfig = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return undefined;
        return mockConfigService.get(key);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: disabledConfig },
      ],
    }).compile();

    const disabled = module.get(AuthService);
    await expect(disabled.loginWithGoogle('token')).rejects.toThrow(ServiceUnavailableException);
    expect(disabled.isGoogleAuthEnabled()).toBe(false);
  });

  it('rejects invalid Google ID tokens', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad token'));
    await expect(service.loginWithGoogle('bad.token')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects unverified Google emails', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'alice@gmail.com',
        email_verified: false,
        iss: 'https://accounts.google.com',
      }),
    });

    await expect(service.loginWithGoogle('id.token')).rejects.toThrow(
      /email is not verified/i,
    );
  });

  it('rejects invalid issuers', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'alice@gmail.com',
        email_verified: true,
        iss: 'https://evil.example',
      }),
    });

    await expect(service.loginWithGoogle('id.token')).rejects.toThrow(/issuer/i);
  });

  it('creates a VIEWER user for a new Google account', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-new',
        email: 'new.user@gmail.com',
        email_verified: true,
        given_name: 'New',
        family_name: 'User',
        picture: 'https://example.com/a.png',
        iss: 'https://accounts.google.com',
      }),
    });

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null) // by googleId
      .mockResolvedValueOnce(null); // by email
    mockPrisma.user.create.mockResolvedValue({
      ...googleUser,
      id: 'created-1',
      email: 'new.user@gmail.com',
      googleId: 'google-sub-new',
      role: 'VIEWER',
    });

    const result = await service.loginWithGoogle('id.token', '127.0.0.1', 'jest');

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new.user@gmail.com',
          googleId: 'google-sub-new',
          authProvider: 'GOOGLE',
          passwordHash: null,
          firstName: 'New',
          lastName: 'User',
        }),
      }),
    );
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.tokens).toHaveProperty('accessToken');
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'USER_REGISTER_GOOGLE' }),
      }),
    );
  });

  it('links Google to an existing local account with the same verified email', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-link',
        email: 'local@example.com',
        email_verified: true,
        iss: 'accounts.google.com',
        picture: 'https://example.com/p.png',
      }),
    });

    const localUser = {
      ...googleUser,
      id: 'local-1',
      email: 'local@example.com',
      passwordHash: 'hashed',
      authProvider: 'LOCAL',
      googleId: null,
      avatarUrl: null,
    };

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null) // by googleId
      .mockResolvedValueOnce(localUser); // by email
    mockPrisma.user.update.mockResolvedValue({
      ...localUser,
      googleId: 'google-sub-link',
      avatarUrl: 'https://example.com/p.png',
    });

    const result = await service.loginWithGoogle('id.token');

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'local-1' },
        data: expect.objectContaining({ googleId: 'google-sub-link' }),
      }),
    );
    expect(result.tokens.accessToken).toBe('mock-token');
  });

  it('logs in an existing Google-linked user', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'alice@gmail.com',
        email_verified: true,
        iss: 'https://accounts.google.com',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce(googleUser);

    const result = await service.loginWithGoogle('id.token');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(result.user.email).toBe('alice@gmail.com');
    expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(googleUser.id);
  });

  it('rejects password login for Google-only accounts', async () => {
    mockUsersService.findByEmail.mockResolvedValue({
      ...googleUser,
      passwordHash: null,
    });

    await expect(
      service.login({ email: 'alice@gmail.com', password: 'Anything@1' }),
    ).rejects.toThrow(/Google sign-in/i);
  });

  it('rejects deactivated Google users', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-123',
        email: 'alice@gmail.com',
        email_verified: true,
        iss: 'https://accounts.google.com',
      }),
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({ ...googleUser, isActive: false });

    await expect(service.loginWithGoogle('id.token')).rejects.toThrow(/deactivated/i);
  });
});
