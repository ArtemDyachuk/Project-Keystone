import { Injectable, Logger } from "@nestjs/common";
import { UserSession, SessionData } from "@keystone/auth";
import { RedisService } from "./redis.service";

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly sessionTTL = 24 * 60 * 60; // 24 hours

  // Memory fallback when Redis unavailable
  private memoryFallback = new Map<string, UserSession>();

  constructor(private readonly redisService: RedisService) {
    // Clean up memory fallback every 5 minutes
    setInterval(() => this.cleanupMemory(), 5 * 60 * 1000);
  }

  async createSession(user: Omit<UserSession, "createdAt" | "expiresAt">): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.sessionTTL * 1000);

    const session: UserSession = {
      ...user,
      selectedCorporationId: user.selectedCorporationId || user.tenantId,
      createdAt: now,
      expiresAt,
    };

    // Try Redis first
    const success = await this.redisService.set(
      `session:${sessionId}`,
      JSON.stringify(session),
      this.sessionTTL
    );

    if (success) {
      // Also track this session for the user (for logout all)
      const client = this.redisService.getClient();
      if (client) {
        await client.sadd(`user:${user.uid}:sessions`, sessionId);
        await client.expire(`user:${user.uid}:sessions`, this.sessionTTL);
      }
    } else {
      // Fallback to memory
      this.memoryFallback.set(sessionId, session);
      this.logger.warn(`Session stored in memory fallback: ${sessionId.substring(0, 8)}...`);
    }

    return sessionId;
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    // Try Redis first
    const redisData = await this.redisService.get(`session:${sessionId}`);
    if (redisData) {
      try {
        const session = JSON.parse(redisData) as UserSession;

        // Extend TTL on each access (activity-based session renewal)
        await this.redisService.set(
          `session:${sessionId}`,
          redisData,
          this.sessionTTL
        );

        return {
          sessionId,
          user: {
            ...session,
            createdAt: new Date(session.createdAt),
            expiresAt: new Date(session.expiresAt),
          },
          isValid: true,
        };
      } catch (error) {
        this.logger.error(`Failed to parse session from Redis: ${sessionId}`, error);
      }
    }

    // Fallback to memory
    const memorySession = this.memoryFallback.get(sessionId);
    if (memorySession) {
      // Check if expired
      if (Date.now() > memorySession.expiresAt.getTime()) {
        this.memoryFallback.delete(sessionId);
        return null;
      }

      return {
        sessionId,
        user: memorySession,
        isValid: true,
      };
    }

    return null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const redisSuccess = await this.redisService.del(`session:${sessionId}`);
    const memorySuccess = this.memoryFallback.delete(sessionId);
    return redisSuccess || memorySuccess;
  }

  async switchCorporation(sessionId: string, selectedCorporationId: string): Promise<boolean> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) return false;

    // TODO: Add corporation access validation here
    // Ensure user has access to the requested corporation

    const updatedSession: UserSession = {
      ...sessionData.user,
      selectedCorporationId,
      expiresAt: new Date(Date.now() + this.sessionTTL * 1000), // Extend expiry
    };

    // Update in Redis
    const success = await this.redisService.set(
      `session:${sessionId}`,
      JSON.stringify(updatedSession),
      this.sessionTTL
    );

    if (!success) {
      // Update in memory fallback
      this.memoryFallback.set(sessionId, updatedSession);
    }

    this.logger.log(`User ${sessionData.user.uid} switched to corporation ${selectedCorporationId}`);
    return true;
  }

  async clearSelectedCorporation(sessionId: string): Promise<boolean> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) return false;

    const updatedSession: UserSession = {
      ...sessionData.user,
      selectedCorporationId: null,
      expiresAt: new Date(Date.now() + this.sessionTTL * 1000), // Extend expiry
    };

    // Update in Redis
    const success = await this.redisService.set(
      `session:${sessionId}`,
      JSON.stringify(updatedSession),
      this.sessionTTL
    );

    if (!success) {
      // Update in memory fallback
      this.memoryFallback.set(sessionId, updatedSession);
    }

    this.logger.log(`User ${sessionData.user.uid} cleared selected corporation`);
    return true;
  }

  async updateTenantId(sessionId: string, tenantId: string): Promise<boolean> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) return false;

    const updatedSession: UserSession = {
      ...sessionData.user,
      tenantId,
      expiresAt: new Date(Date.now() + this.sessionTTL * 1000), // Extend expiry
    };

    // Update in Redis
    const success = await this.redisService.set(
      `session:${sessionId}`,
      JSON.stringify(updatedSession),
      this.sessionTTL
    );

    if (!success) {
      // Update in memory fallback
      this.memoryFallback.set(sessionId, updatedSession);
    }

    this.logger.log(`User ${sessionData.user.uid} updated tenant ID to ${tenantId}`);
    return true;
  }

  async updateRoles(sessionId: string, roles: string[]): Promise<boolean> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) return false;

    const updatedSession: UserSession = {
      ...sessionData.user,
      roles,
      expiresAt: new Date(Date.now() + this.sessionTTL * 1000), // Extend expiry
    };

    // Update in Redis
    const success = await this.redisService.set(
      `session:${sessionId}`,
      JSON.stringify(updatedSession),
      this.sessionTTL
    );

    if (!success) {
      // Update in memory fallback
      this.memoryFallback.set(sessionId, updatedSession);
    }

    this.logger.log(`User ${sessionData.user.uid} updated roles to [${roles.join(', ')}]`);
    return true;
  }

  async deleteAllUserSessions(userUid: string): Promise<number> {
    let deletedCount = 0;

    try {
      // Get all session IDs for this user from Redis
      if (this.redisService.isConnected()) {
        const client = this.redisService.getClient();
        if (client) {
          const sessionIds = await client.smembers(`user:${userUid}:sessions`);

          // Delete each session
          for (const sessionId of sessionIds) {
            const success = await this.deleteSession(sessionId);
            if (success) deletedCount++;
          }

          // Clear the user's session index
          await client.del(`user:${userUid}:sessions`);
        }
      }

      // Also clean up memory fallback
      for (const [sessionId, session] of this.memoryFallback.entries()) {
        if (session.uid === userUid) {
          this.memoryFallback.delete(sessionId);
          deletedCount++;
        }
      }

      this.logger.log(`Deleted ${deletedCount} sessions for user ${userUid}`);
    } catch (error) {
      this.logger.error(`Failed to delete all sessions for user ${userUid}:`, error);
    }

    return deletedCount;
  }

  /**
   * Invalidate all sessions for a specific user (admin function)
   * This allows admins to force logout users
   */
  async invalidateUserSessions(userUid: string, reason: string = "Admin action", adminTenantId?: string): Promise<number> {
    // If adminTenantId is provided, validate that the target user belongs to the same tenant
    if (adminTenantId) {
      const targetUserSessions = await this.getUserSessions(userUid);
      if (targetUserSessions.length > 0) {
        const firstSession = targetUserSessions[0];
        if (firstSession.tenantId !== adminTenantId) {
          throw new Error(`Cannot invalidate sessions for user from different tenant. Admin tenant: ${adminTenantId}, User tenant: ${firstSession.tenantId}`);
        }
      }
    }

    const deletedCount = await this.deleteAllUserSessions(userUid);
    this.logger.log(`Admin invalidated ${deletedCount} sessions for user ${userUid}. Reason: ${reason}`);
    return deletedCount;
  }

  /**
   * Get all sessions for a specific user (for tenant validation)
   */
  async getUserSessions(userUid: string): Promise<UserSession[]> {
    const sessions: UserSession[] = [];

    try {
      // Get session IDs from Redis
      if (this.redisService.isConnected()) {
        const client = this.redisService.getClient();
        if (client) {
          const sessionIds = await client.smembers(`user:${userUid}:sessions`);

          // Get session data for each session ID
          for (const sessionId of sessionIds) {
            const sessionData = await this.getSession(sessionId);
            if (sessionData && sessionData.user.uid === userUid) {
              sessions.push(sessionData.user);
            }
          }
        }
      }

      // Also check memory fallback
      for (const [, session] of this.memoryFallback.entries()) {
        if (session.uid === userUid) {
          sessions.push(session);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to get sessions for user ${userUid}:`, error);
    }

    return sessions;
  }

  /**
   * Check if a user's sessions should be invalidated
   * This can be called during session validation to check user status
   */
    async shouldInvalidateUserSessions(userUid: string, userService: any, tenantId: string): Promise<boolean> {
    try {
      // Get user from database to check status
      const user = await userService.getUserById(userUid, tenantId);
      
      // Invalidate sessions if user is deleted, disabled, or has other issues
      if (!user || user.deleted || user.disabled || user.status === "suspended") {
        await this.invalidateUserSessions(userUid, `User status: ${user?.status || "deleted"}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to check user status for ${userUid}:`, error);
      // If we can't verify user status, err on the side of caution
      return true;
    }
  }

  async rotateSession(oldSessionId: string, newRoles: string[]): Promise<string | null> {
    const existingSession = await this.getSession(oldSessionId);
    if (!existingSession) return null;

    // Create new session with updated roles
    const newSessionId = await this.createSession({
      ...existingSession.user,
      roles: newRoles,
    });

    // Delete old session
    await this.deleteSession(oldSessionId);

    this.logger.log(`Session rotated for user ${existingSession.user.uid}: ${oldSessionId.substring(0, 8)}... -> ${newSessionId.substring(0, 8)}...`);
    return newSessionId;
  }

  async getSessionCount(): Promise<{ redis: number; memory: number; total: number }> {
    let redisCount = 0;

    if (this.redisService.isConnected()) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          const keys = await client.keys("session:*");
          redisCount = keys.length;
        }
      } catch (error) {
        this.logger.error("Error counting Redis sessions:", error);
      }
    }

    const memoryCount = this.memoryFallback.size;

    return {
      redis: redisCount,
      memory: memoryCount,
      total: redisCount + memoryCount,
    };
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);
  }

  private cleanupMemory(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.memoryFallback.entries()) {
      if (now > session.expiresAt.getTime()) {
        this.memoryFallback.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired sessions from memory`);
    }
  }
}
