import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { connectToDatabase, disconnectFromDatabase, isConnectedToDatabase } from "@keystone/database";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    try {
      await connectToDatabase();
      this.logger.log("Database connection established");
    } catch (error) {
      this.logger.error("Failed to connect to database", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await disconnectFromDatabase();
      this.logger.log("Database connection closed");
    } catch (error) {
      this.logger.error("Error closing database connection", error);
    }
  }

  isConnected(): boolean {
    return isConnectedToDatabase();
  }
}
