import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const activate = super.canActivate(context);

    if (!isPublic) {
      return activate;
    }

    // Public: attempt auth so CurrentUser works when a token is present,
    // but never block anonymous access.
    if (typeof activate === 'boolean') {
      return true;
    }

    if (activate instanceof Promise) {
      return activate.catch(() => true).then(() => true);
    }

    return from(activate as Observable<boolean>).pipe(
      map(() => true),
      catchError(() => of(true)),
    );
  }

  handleRequest(err: any, user: any, _info: any, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return user || null;
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
