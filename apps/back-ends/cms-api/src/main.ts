import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

async function bootstrap() {
  // Simple environment validation - only check critical vars
  if (!process.env.MONGODB_URI) {
    Logger.error('MONGODB_URI is required');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Basic security headers
  app.use(helmet());

  // Simple CORS for Render.com backend
  const isDev = process.env.NODE_ENV !== 'production';
  
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // No origin = mobile/postman/server-to-server
      if (!origin) return callback(null, true);
      
      // Dev: allow any localhost
      if (isDev && origin.includes('localhost')) return callback(null, true);
      
      // Prod: Your specific Vercel domain + any .vercel.app for preview deploys
      if (origin === process.env.FRONTEND_CMS_URL || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      
      Logger.warn(`CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  // Enhanced rate limiting with different tiers
  
  // Strict rate limiting for sensitive auth endpoints
  app.use('/api/auth/login', rateLimit({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/api/auth/signup-email-link', rateLimit({ 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 signups per hour per IP
    message: { error: 'Too many signup attempts. Please try again in 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/api/auth/forgot-password', rateLimit({ 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
    message: { error: 'Too many password reset attempts. Please try again in 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Moderate rate limiting for other auth endpoints
  app.use('/api/auth', rateLimit({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes
    message: { error: 'Too many authentication requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Strict rate limiting for import endpoints (when they exist)
  app.use('/api/import', rateLimit({ 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 imports per hour
    message: { error: 'Too many import requests. Please try again in 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/api/upload', rateLimit({ 
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: { error: 'Too many upload requests. Please try again in 1 hour.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // General API rate limiting
  app.use('/api', rateLimit({ 
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: { error: 'Too many API requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
