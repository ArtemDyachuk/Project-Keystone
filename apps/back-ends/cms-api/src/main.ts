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

  // CORS for frontend communication
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

  // Simple rate limiting
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
