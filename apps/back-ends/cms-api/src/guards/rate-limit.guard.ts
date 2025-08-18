import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { sessionStore } from "../lib/session/session.store";
import { RATE_LIMIT_KEY, RateLimitOptions } from "../decorators/rate-limit.decorator";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      ctx.getHandler()
    );

    if (!rateLimitOptions) {
      return true; // No rate limit configured
    }

    const req = ctx.switchToHttp().getRequest<Request>();
    
    // Generate rate limit key
    let key: string;
    if (rateLimitOptions.keyGenerator) {
      key = rateLimitOptions.keyGenerator(req);
    } else {
      // Default key: combine IP and user ID if available
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const uid = (req as any).user?.uid || 'anonymous';
      key = `rate_limit:${ip}:${uid}:${ctx.getHandler().name}`;
    }

    try {
      // Use Redis for distributed rate limiting
      const redis = (sessionStore as any).redis; // Access Redis client from session store
      const current = await redis.incr(key);
      
      if (current === 1) {
        // First request in window, set expiration
        await redis.expire(key, Math.ceil(rateLimitOptions.windowMs / 1000));
      }

      if (current > rateLimitOptions.max) {
        throw new HttpException(
          `Too many requests. Maximum ${rateLimitOptions.max} requests per ${rateLimitOptions.windowMs / 1000} seconds.`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      console.error('Rate limiting error:', error);
      // If Redis is down, allow the request to proceed
      return true;
    }
  }
}
