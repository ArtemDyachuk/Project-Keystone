import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import { sessionStore, SessionData } from "../lib/session/session.store";
import { getSessionConfig } from "../lib/session/session.config";

export const REDIS_OPTIONAL_KEY = 'redisOptional';
export const RedisOptional = () => Reflect.metadata(REDIS_OPTIONAL_KEY, true);

// Extend the Request interface to include session context
interface SessionAwareRequest extends Request {
  sessionCtx?: SessionData;
  sessionId?: string;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<SessionAwareRequest>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const sessionConfig = getSessionConfig();

    // Get session ID from cookie
    const sessionId = req.cookies?.[sessionConfig.cookieName];

    if (!sessionId) {
      throw new UnauthorizedException("No session found. Please log in.");
    }

    // Check if Redis is optional for this route
    const redisOptional = this.reflector.getAllAndOverride<boolean>(REDIS_OPTIONAL_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    try {
      // Load session from Redis (this also refreshes TTL for rolling sessions)
      const sessionData = await sessionStore.getSession(sessionId);

      if (!sessionData) {
        // Session expired or invalid - clear the cookie
        res.clearCookie(sessionConfig.cookieName, sessionConfig.cookieOptions);
        throw new UnauthorizedException("Session expired. Please log in again.");
      }

      // Enforce firebase tenant match if both are present (strict GIP tenant isolation)
      const firebaseTenantFromCookie = (req as any).firebase?.tenant as string | undefined;
      if (firebaseTenantFromCookie && sessionData.firebaseTenantId) {
        if (firebaseTenantFromCookie !== sessionData.firebaseTenantId) {
          // Clear cookie and block - tenant mismatch
          res.clearCookie(sessionConfig.cookieName, sessionConfig.cookieOptions);
          throw new UnauthorizedException("Authentication tenant mismatch. Please sign in again.");
        }
      }

      // Attach session context to request
      req.sessionCtx = sessionData;
      req.sessionId = sessionId;

      return true;
    } catch (error) {
      console.error("❌ Session validation failed:", error);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Check if this is a Redis connectivity issue
      const isRedisError = this.isRedisConnectionError(error);
      
      if (isRedisError) {
        if (redisOptional) {
          console.warn("⚠️ Redis unavailable but route allows degraded mode");
          return true; // Allow access in degraded mode
        } else {
          // Critical session-dependent route - fail with 503
          throw new ServiceUnavailableException("Session service temporarily unavailable");
        }
      }
      
      // Clear potentially corrupted session cookie
      res.clearCookie(sessionConfig.cookieName, sessionConfig.cookieOptions);
      throw new UnauthorizedException("Invalid session. Please log in again.");
    }
  }

  /**
   * Check if error is related to Redis connectivity
   */
  private isRedisConnectionError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code?.toLowerCase() || '';
    
    return (
      errorMessage.includes('connection') ||
      errorMessage.includes('redis') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused') ||
      errorCode === 'econnrefused' ||
      errorCode === 'etimedout' ||
      errorCode === 'enotfound'
    );
  }
}
