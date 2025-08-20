import { Injectable, Logger } from "@nestjs/common";
import { randomBytes } from "crypto";
import { RedisService } from "./redis.service";

@Injectable()
export class CSRFService {
  private readonly logger = new Logger(CSRFService.name);
  private readonly tokenTTL = 60 * 60; // 1 hour

  // Memory fallback when Redis unavailable
  private memoryFallback = new Map<string, { token: string; expiresAt: Date }>();

  constructor(private readonly redisService: RedisService) {
    // Clean up memory fallback every 5 minutes
    setInterval(() => this.cleanupMemory(), 5 * 60 * 1000);
  }

  async generateToken(sessionId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + this.tokenTTL * 1000);

    // Try Redis first
    const success = await this.redisService.set(`csrf:${sessionId}`, token, this.tokenTTL);

    if (!success) {
      // Fallback to memory
      this.memoryFallback.set(sessionId, { token, expiresAt });
      this.logger.warn(`CSRF token stored in memory fallback: ${sessionId.substring(0, 8)}...`);
    }

    return token;
  }

  async validateToken(sessionId: string, token: string): Promise<boolean> {
    // Try Redis first
    const redisToken = await this.redisService.get(`csrf:${sessionId}`);
    if (redisToken === token) {
      return true;
    }

    // Fallback to memory
    const memoryData = this.memoryFallback.get(sessionId);
    if (memoryData) {
      // Check if expired
      if (Date.now() > memoryData.expiresAt.getTime()) {
        this.memoryFallback.delete(sessionId);
        return false;
      }
      return memoryData.token === token;
    }

    return false;
  }

  async deleteToken(sessionId: string): Promise<boolean> {
    const redisSuccess = await this.redisService.del(`csrf:${sessionId}`);
    const memorySuccess = this.memoryFallback.delete(sessionId);
    return redisSuccess || memorySuccess;
  }

  private cleanupMemory(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, tokenData] of this.memoryFallback.entries()) {
      if (now > tokenData.expiresAt.getTime()) {
        this.memoryFallback.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired CSRF tokens from memory`);
    }
  }
}
