import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { SessionService } from '../services/session.service';

@Injectable()
export class StepUpGuard implements CanActivate {
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

    // Get session data
    const sessionData = await this.sessionService.getSession(sessionId);
    
    if (!sessionData) {
      throw new HttpException('Session expired', HttpStatus.UNAUTHORIZED);
    }

    // Check if user has MFA enabled
    if (!sessionData.user.mfa) {
      throw new HttpException('MFA not enabled for this account', HttpStatus.FORBIDDEN);
    }

    // Check if MFA verification is fresh (within 10 minutes)
    const isMfaValid = await this.sessionService.isMfaValid(sessionId, 600); // 600 seconds = 10 minutes
    
    if (!isMfaValid) {
      throw new HttpException(
        { 
          code: 'STEP_UP_REQUIRED',
          message: 'Fresh MFA verification required for this action'
        }, 
        HttpStatus.UNAUTHORIZED
      );
    }

    // Attach user data to request for use in controllers
    request.user = sessionData.user;
    request.sessionId = sessionData.sessionId;

    return true;
  }
}
