import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantController } from '../controllers/tenant.controller';
import { UserController } from '../controllers/user.controller';
import { RolesController } from '../controllers/roles.controller';
import { DatabaseModule } from '../database/database.module';
import { FirebaseSessionGuard } from '../guards/firebase-session.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available throughout the app
    }),
    DatabaseModule
  ],
  controllers: [AppController, TenantController, UserController, RolesController],
  providers: [AppService, FirebaseSessionGuard],
})
export class AppModule { }
