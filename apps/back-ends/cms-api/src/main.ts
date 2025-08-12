/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

// Load environment variables
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for all origins (or specify your Vercel domain)
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002', 
      'https://project-keystone-six.vercel.app',
      'https://*.vercel.app', // Allow all Vercel preview deployments
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
