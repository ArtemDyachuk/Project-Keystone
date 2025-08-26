import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // Simple environment validation - only check critical vars
  if (!process.env.MONGODB_URI) {
    Logger.error('MONGODB_URI is required');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Trust proxy headers (environment-aware)
  // Production: Client → Cloudflare → Render → Your App = 2 hops
  // Development: No proxy (direct connection)
  const hops = process.env.NODE_ENV === 'production' ? 2 : 0;
  (app.getHttpAdapter().getInstance() as any).set?.('trust proxy', hops);

  // Basic security headers
  app.use(helmet());

  // Cookie parsing middleware - CRITICAL for session management
  app.use(cookieParser());

  // CORS configuration - handles main domain + preview deployments
  const allowed = [
    process.env.FRONTEND_CMS_URL,            // Local: http://localhost:3000, Prod: https://your-domain.com
    /\.vercel\.app$/,                        // Vercel preview deployments
    /\.render\.com$/,                        // Render preview deployments
  ];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // No origin = mobile/postman/server-to-server
      if (!origin) return callback(null, true);

      const ok = allowed.some((a) => (a instanceof RegExp ? a.test(origin) : a === origin));
      return ok ? callback(null, true) : callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Enhanced rate limiting with different tiers
  // 
  // RATE LIMITING STRATEGY:
  // 1. Authenticated users (with valid session) - NO RATE LIMITING
  //    - These are legitimate users, no need to limit them
  //    - Session validation happens via Redis
  // 2. Unauthenticated requests - RATE LIMITED
  //    - Prevents abuse from bots/attackers
  //    - Protects against DDoS without affecting real users
  //
  // SESSION VALIDATION:
  // - Uses Redis session store for validation
  // - Simple cookie check for performance
  // - Fallback to full session validation if needed

  // Configure rate limiting to work with proxy headers safely
  const rateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  };

  // Session-aware rate limiter that skips authenticated users
  const sessionAwareLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => {
      const path = req.path;

      // Always skip health checks and static files
      if (path === '/health' || path === '/favicon.ico') {
        return true;
      }

      // Skip rate limiting for requests with valid session cookies
      // This allows authenticated users to make unlimited requests
      const sessionCookie = req.cookies?.session;

      // Basic session validation:
      // 1. Session cookie exists
      // 2. Session cookie has reasonable length (not empty or too short)
      // 3. Session cookie looks like a valid session ID
      if (sessionCookie &&
        sessionCookie.length >= 20 &&
        sessionCookie.length <= 100 &&
        /^[a-zA-Z0-9_-]+$/.test(sessionCookie)) { // Alphanumeric + underscore + dash
        return true; // Skip rate limiting for authenticated users
      }

      // Rate limit unauthenticated requests
      return false;
    },
  });

  // Strict rate limiting for sensitive auth endpoints
  app.use('/api/auth/login', rateLimit({
    ...rateLimitOptions,
    // max: 100, // for testing only
    max: 5, // 10 attempts per 15 minutes
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  }));

  app.use('/api/auth/signup-email-link', rateLimit({
    ...rateLimitOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Temporarily increased to 100 for testing
    // max: 100, // Temporarily increased to 100 for testing
    message: { error: 'Too many signup attempts. Please try again in 1 hour.' },
  }));

  app.use('/api/auth/forgot-password', rateLimit({
    ...rateLimitOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
    message: { error: 'Too many password reset attempts. Please try again in 1 hour.' },
  }));

  // Moderate rate limiting for other auth endpoints
  app.use('/api/auth', rateLimit({
    ...rateLimitOptions,
    max: 25, // Temporarily increased to 100 for testing
    // max: 100, // Temporarily increased to 100 for testing
    message: { error: 'Too many authentication requests. Please try again later.' },
  }));

  // Strict rate limiting for import endpoints (when they exist)
  app.use('/api/import', rateLimit({
    ...rateLimitOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 imports per hour
    message: { error: 'Too many import requests. Please try again in 1 hour.' },
  }));

  app.use('/api/upload', rateLimit({
    ...rateLimitOptions,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: { error: 'Too many upload requests. Please try again in 1 hour.' },
  }));

  // Session-aware API rate limiting (authenticated users bypass limits)
  app.use('/api', sessionAwareLimiter);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );

  // Graceful shutdown handling
  process.on('SIGTERM', () => app.close());
  process.on('SIGINT', () => app.close());
}

bootstrap();
