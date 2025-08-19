import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { CSRFService } from '../services/csrf.service';

@Injectable()
export class CSRFGuard implements CanActivate {
  constructor(private readonly csrfService: CSRFService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only protect state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return true;
    }

    // Skip CSRF for login endpoint (chicken-and-egg problem)
    const url = request.url;
    if (url.includes('/auth/login') || url.includes('/auth/signup-email-link')) {
      return true;
    }

    // Get session ID from cookie
    const sessionId = request.cookies?.session;
    if (!sessionId) {
      throw new HttpException('Session required for this operation', HttpStatus.UNAUTHORIZED);
    }

    // Get CSRF token from header or body
    const csrfToken = request.headers['x-csrf-token'] || request.body?.csrfToken;
    if (!csrfToken) {
      throw new HttpException('CSRF token required', HttpStatus.FORBIDDEN);
    }

    // Validate CSRF token
    const isValid = this.csrfService.validateToken(sessionId, csrfToken);
    if (!isValid) {
      throw new HttpException('Invalid CSRF token', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
