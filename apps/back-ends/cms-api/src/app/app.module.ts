import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantController } from '../controllers/tenant.controller';
import { DatabaseModule } from '../database/database.module';
import { CognitoAdminService } from '../services/cognito-admin.service';
import { TenantAccessGuard } from '../guards/tenant-access.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController, TenantController],
  providers: [AppService, CognitoAdminService, TenantAccessGuard],
})
export class AppModule {}
