import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantController } from '../controllers/tenant.controller';
import { AuthController } from '../controllers/auth.controller';
import { UserController } from '../controllers/user.controller';

import { DatabaseModule } from '../database/database.module';
import { EmailService } from '../services/email.service';
import { SessionService } from '../services/session.service';
import { CSRFService } from '../services/csrf.service';
import { RedisService } from '../services/redis.service';
import { TenantAccessGuard } from '../guards/tenant-access.guard';
import { SessionGuard } from '../guards/session.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available throughout the app
    }),
    DatabaseModule
  ],
  controllers: [AppController, TenantController, AuthController, UserController],
  providers: [
    AppService,
    TenantAccessGuard,
    SessionGuard,
    EmailService,
    RedisService,
    SessionService,
    CSRFService,
  ],
})
export class AppModule { }
