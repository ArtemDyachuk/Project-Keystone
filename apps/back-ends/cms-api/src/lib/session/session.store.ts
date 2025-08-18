import Redis from "ioredis";
import { randomBytes } from "crypto";
import { UserRole } from "@keystone/auth";

export interface SessionData {
  uid: string;
  tenantId?: string;
  roles?: UserRole[]; // Changed from single role to array of roles
  mfaStrongUntil?: number; // Epoch timestamp when MFA expires
  firebaseTenantId?: string; // GIP tenant id
  firebaseUid?: string; // UID within that GIP tenant
  issuedAt: number;
  lastSeen: number;
  deviceId?: string;
}

export interface CreateSessionOptions {
  uid: string;
  tenantId?: string;
  roles?: UserRole[]; // Changed from single role to array of roles
  mfaStrongUntil?: number; // Epoch timestamp when MFA expires
  deviceId?: string;
  firebaseTenantId?: string;
  firebaseUid?: string;
}

class SessionStore {
  private redis: Redis;
  private ttlSeconds: number;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    this.ttlSeconds = parseInt(process.env.SESSION_TTL_SECONDS || "86400", 10); // 24 hours default

    this.redis = new Redis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.redis.on("error", (error) => {
      console.error("Redis connection error:", error);
    });

    this.redis.on("connect", () => {
      console.log("✅ Redis connected for session store");
    });
  }

  /**
   * Generate a cryptographically secure session ID
   */
  private generateSid(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Get Redis key for session ID
   */
  private getSessionKey(sid: string): string {
    return `session:${sid}`;
  }

  /**
   * Get Redis key for user session index
   */
  private getUserSessionsKey(uid: string): string {
    return `user:${uid}:sessions`;
  }

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<{ sid: string }> {
    const sid = this.generateSid();
    const now = Date.now();

    const sessionData: SessionData = {
      uid: options.uid,
      tenantId: options.tenantId,
      roles: options.roles,
      mfaStrongUntil: options.mfaStrongUntil,
      firebaseTenantId: options.firebaseTenantId,
      firebaseUid: options.firebaseUid,
      issuedAt: now,
      lastSeen: now,
      deviceId: options.deviceId,
    };

    const key = this.getSessionKey(sid);
    const userSessionsKey = this.getUserSessionsKey(options.uid);

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    pipeline.setex(key, this.ttlSeconds, JSON.stringify(sessionData));
    pipeline.sadd(userSessionsKey, sid); // Add to user's session set
    pipeline.expire(userSessionsKey, this.ttlSeconds + 3600); // Keep index slightly longer
    await pipeline.exec();

    return { sid };
  }

  /**
   * Get session data and refresh TTL (rolling session)
   */
  async getSession(sid: string): Promise<SessionData | null> {
    if (!sid) return null;

    const key = this.getSessionKey(sid);
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      const sessionData: SessionData = JSON.parse(data);

      // Update lastSeen and refresh TTL (rolling session)
      sessionData.lastSeen = Date.now();
      await this.redis.setex(key, this.ttlSeconds, JSON.stringify(sessionData));

      return sessionData;
    } catch (error) {
      console.error("Failed to parse session data:", error);
      // Clean up corrupted session
      await this.redis.del(key);
      return null;
    }
  }

  /**
   * Update session with partial data
   */
  async updateSession(sid: string, patch: Partial<SessionData>): Promise<boolean> {
    if (!sid) return false;

    const key = this.getSessionKey(sid);
    const existingData = await this.redis.get(key);

    if (!existingData) return false;

    try {
      const sessionData: SessionData = JSON.parse(existingData);
      const updatedData: SessionData = {
        ...sessionData,
        ...patch,
        lastSeen: Date.now(), // Always update lastSeen
      };

      await this.redis.setex(key, this.ttlSeconds, JSON.stringify(updatedData));
      return true;
    } catch (error) {
      console.error("Failed to update session:", error);
      return false;
    }
  }

  /**
   * Rotate session ID (copy data to new session and delete old)
   */
  async rotateSession(oldSid: string): Promise<{ newSid: string } | null> {
    if (!oldSid) return null;

    const oldKey = this.getSessionKey(oldSid);
    const data = await this.redis.get(oldKey);

    if (!data) return null;

    try {
      const sessionData: SessionData = JSON.parse(data);
      const newSid = this.generateSid();
      const newKey = this.getSessionKey(newSid);

      // Update session data with new issuedAt and lastSeen
      sessionData.issuedAt = Date.now();
      sessionData.lastSeen = Date.now();

      // Create new session
      await this.redis.setex(newKey, this.ttlSeconds, JSON.stringify(sessionData));

      // Delete old session
      await this.redis.del(oldKey);

      return { newSid };
    } catch (error) {
      console.error("Failed to rotate session:", error);
      return null;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sid: string): Promise<boolean> {
    if (!sid) return false;

    // Get session data first to find the user
    const sessionData = await this.getSession(sid);
    const key = this.getSessionKey(sid);

    if (sessionData) {
      const userSessionsKey = this.getUserSessionsKey(sessionData.uid);
      // Use pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.del(key);
      pipeline.srem(userSessionsKey, sid); // Remove from user's session set
      await pipeline.exec();
    } else {
      // If we can't get session data, just delete the session key
      await this.redis.del(key);
    }

    return true;
  }

  /**
   * Get all sessions for a user (optimized with index)
   */
  async getUserSessions(uid: string): Promise<{ sid: string; data: SessionData }[]> {
    const userSessionsKey = this.getUserSessionsKey(uid);
    const sessionIds = await this.redis.smembers(userSessionsKey);
    const sessions: { sid: string; data: SessionData }[] = [];

    for (const sid of sessionIds) {
      const sessionData = await this.getSession(sid);
      if (sessionData) {
        sessions.push({ sid, data: sessionData });
      } else {
        // Clean up stale session ID from index
        await this.redis.srem(userSessionsKey, sid);
      }
    }

    return sessions;
  }

  /**
   * Delete all sessions for a user (optimized)
   */
  async deleteUserSessions(uid: string): Promise<number> {
    const userSessionsKey = this.getUserSessionsKey(uid);
    const sessionIds = await this.redis.smembers(userSessionsKey);

    if (sessionIds.length === 0) {
      return 0;
    }

    // Build session keys
    const sessionKeys = sessionIds.map(sid => this.getSessionKey(sid));

    // Use pipeline for efficient batch deletion
    const pipeline = this.redis.pipeline();
    sessionKeys.forEach(key => pipeline.del(key));
    pipeline.del(userSessionsKey); // Clear the user session index

    const results = await pipeline.exec();

    // Count successful deletions (exclude the index deletion)
    let deleted = 0;
    for (let i = 0; i < sessionIds.length; i++) {
      if (results?.[i]?.[1] === 1) deleted++;
    }

    return deleted;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
export const sessionStore = new SessionStore();
