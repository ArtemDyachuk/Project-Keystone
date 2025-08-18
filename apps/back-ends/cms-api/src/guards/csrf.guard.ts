import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CsrfService } from '../lib/security/csrf.service';
import 'reflect-metadata';

export const SKIP_CSRF_KEY = 'skipCsrf';
export const SkipCsrf = () => SetMetadata(SKIP_CSRF_KEY, true);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if CSRF protection should be skipped for this route
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toLowerCase();

    // Only protect state-changing methods
    if (!['post', 'put', 'patch', 'delete'].includes(method)) {
      return true;
    }

    const cookieToken = this.csrfService.getTokenFromCookie(request);
    const headerToken = this.csrfService.getTokenFromHeader(request);
    const sessionId = (request as any).sessionId; // Set by SessionGuard

    if (!sessionId) {
      throw new ForbiddenException('Session required for CSRF validation');
    }

    if (!cookieToken || !headerToken || !this.csrfService.validateToken(cookieToken, headerToken, sessionId)) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
