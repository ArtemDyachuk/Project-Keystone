import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly userService: UserService
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
      throw new HttpException('Session expired', HttpStatus.UNAUTHORIZED);
    }

    // Check if user status requires session invalidation
    if (sessionData.user.tenantId) {
      const shouldInvalidate = await this.sessionService.shouldInvalidateUserSessions(
        sessionData.user.uid, 
        this.userService,
        sessionData.user.tenantId
      );

      if (shouldInvalidate) {
        throw new HttpException('Account status changed', HttpStatus.UNAUTHORIZED);
      }
    }

    // Attach user data to request for use in controllers
    request.user = sessionData.user;
    request.sessionId = sessionData.sessionId;

    return true;
  }
}
