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

  // Configure rate limiting to work with proxy headers safely
  const rateLimitOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  };

  // Reusable general rate limiter instance (performance optimization)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => req.path === '/health' || req.path === '/favicon.ico',
  });

  // Strict rate limiting for sensitive auth endpoints
  app.use('/api/auth/login', rateLimit({
    ...rateLimitOptions,
    max: 5, // 5 attempts per 15 minutes
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

  // General API rate limiting
  app.use('/api', generalLimiter);

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
