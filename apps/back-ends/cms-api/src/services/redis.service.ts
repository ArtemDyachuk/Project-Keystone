import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  async onModuleInit() {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL;

      if (!redisUrl) {
        this.logger.warn("No REDIS_URL found, running without Redis");
        return;
      }

      this.logger.log(`Connecting to Redis: ${redisUrl}`);

      this.client = new Redis(redisUrl);

      await this.client.ping();
      this.logger.log("✅ Redis connected successfully");

    } catch (error) {
      this.logger.error("❌ Redis connection failed:", error);
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.status === "ready";
  }

  getClient(): Redis | null {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    if (!this.client) return false;

    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      this.logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      this.logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }
}
