import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';

// Extend Request interface to include user and sessionId
interface RequestWithUser extends Request {
  user?: any;
  sessionId?: string;
}

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);

  constructor(private readonly sessionService: SessionService) { }

  async use(req: RequestWithUser, res: Response, next: NextFunction) {
    const sessionId = req.cookies?.session;

    if (sessionId) {
      try {
        // Validate session synchronously to ensure user data is available
        const session = await this.sessionService.getSession(sessionId);
        if (session) {
          req.user = session.user;
          req.sessionId = sessionId;
          this.logger.debug(`Session validated for user: ${session.user.uid}`);
          this.logger.debug(`DEBUG: Set req.user = ${JSON.stringify(session.user)}`);
          this.logger.debug(`DEBUG: Set req.sessionId = ${sessionId}`);
        } else {
          this.logger.debug(`Invalid session ID: ${sessionId}`);
        }
      } catch (error) {
        this.logger.warn(`Session validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    next();
  }
}
