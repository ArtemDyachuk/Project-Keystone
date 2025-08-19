import { Injectable } from '@nestjs/common';
import { UserSession, SessionData } from '@keystone/auth';

/**
 * Simple in-memory session storage
 * In production, you'd use Redis or database
 */
@Injectable()
export class SessionService {
  private sessions = new Map<string, UserSession>();

  /**
   * Create a new session
   */
  createSession(user: Omit<UserSession, 'createdAt' | 'expiresAt'>): string {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const session: UserSession = {
      ...user,
      createdAt: now,
      expiresAt,
    };

    this.sessions.set(sessionId, session);

    // Clean up expired sessions
    this.cleanupExpiredSessions();

    return sessionId;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return {
      sessionId,
      user: session,
      isValid: true,
    };
  }

  /**
   * Delete session (logout)
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Update session (extend expiry, update user data)
   */
  updateSession(sessionId: string, updates: Partial<UserSession>): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Extend expiry when updating
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    this.sessions.set(sessionId, {
      ...session,
      ...updates,
      expiresAt,
    });

    return true;
  }

  /**
   * Generate secure session ID
   */
  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get session count (for monitoring)
   */
  getSessionCount(): number {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }

  /**
   * Get all session IDs (for debugging)
   */
  getAllSessionIds(): string[] {
    this.cleanupExpiredSessions();
    return Array.from(this.sessions.keys());
  }
}
