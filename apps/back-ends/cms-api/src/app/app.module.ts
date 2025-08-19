import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantController } from '../controllers/tenant.controller';
import { AuthController } from '../controllers/auth.controller';
import { DatabaseModule } from '../database/database.module';
import { CognitoAdminService } from '../services/cognito-admin.service'; // Soon to be removed
import { EmailService } from '../services/email.service';
import { TenantAccessGuard } from '../guards/tenant-access.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available throughout the app
    }),
    DatabaseModule
  ],
  controllers: [AppController, TenantController, AuthController],
  providers: [AppService, CognitoAdminService, TenantAccessGuard, EmailService],
})
export class AppModule { }
