import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { SessionService } from '../services/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get session ID from HttpOnly cookie
    const sessionId = request.cookies?.session;
    if (!sessionId) {
      throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
    }

    // Validate session
    const sessionData = await this.sessionService.getSession(sessionId);
    if (!sessionData) {
      throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
    }

    // Attach user data to request for use in controllers
    request.user = sessionData.user;
    request.sessionId = sessionData.sessionId;

    return true;
  }
}
