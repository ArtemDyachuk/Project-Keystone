import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UIDemoController } from './ui-demo.controller';
import { TenantSimpleController } from './tenant-simple.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AppController, UIDemoController, TenantSimpleController],
  providers: [AppService],
})
export class AppModule {}
