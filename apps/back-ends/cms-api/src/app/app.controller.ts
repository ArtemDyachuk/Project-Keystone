import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from '../database/database.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      database: {
        connected: this.databaseService.isConnected()
      }
    };
  }
}
