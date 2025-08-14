import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantController } from './tenant.controller';
import { DatabaseModule } from '../database/database.module';
import { CognitoAdminService } from '../services/cognito-admin.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController, TenantController],
  providers: [AppService, CognitoAdminService],
})
export class AppModule {}
