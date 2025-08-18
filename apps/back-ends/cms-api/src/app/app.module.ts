import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantController } from '../controllers/tenant.controller';
import { UserController } from '../controllers/user.controller';
import { RolesController } from '../controllers/roles.controller';
import { AuthController } from '../controllers/auth.controller';
import { HealthController } from '../controllers/health.controller';
import { SessionsController } from '../controllers/sessions.controller';
import { DatabaseModule } from '../database/database.module';
import { FirebaseSessionGuard } from '../guards/firebase-session.guard';
import { SessionGuard } from '../guards/session.guard';
import { TenantGuard } from '../guards/tenant-access.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { CsrfGuard } from '../guards/csrf.guard';
import { CsrfService } from '../lib/security/csrf.service';
import { TenantEnforcementInterceptor } from '../interceptors/tenant-enforcement.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available throughout the app
    }),
    DatabaseModule
  ],
  controllers: [AppController, TenantController, UserController, RolesController, AuthController, HealthController, SessionsController],
  providers: [
    AppService, 
    FirebaseSessionGuard, 
    SessionGuard, 
    TenantGuard, 
    RateLimitGuard, 
    CsrfGuard,
    CsrfService,
    Reflector,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantEnforcementInterceptor,
    },
  ],
})
export class AppModule { }
