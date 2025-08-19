import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

@Injectable()
export class CSRFService {
  private tokens = new Map<string, { token: string; expiresAt: Date }>();

  /**
   * Generate CSRF token for a session
   */
  generateToken(sessionId: string): string {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    this.tokens.set(sessionId, { token, expiresAt });
    
    // Clean up expired tokens
    this.cleanupExpiredTokens();
    
    return token;
  }

  /**
   * Validate CSRF token for a session
   */
  validateToken(sessionId: string, token: string): boolean {
    const storedToken = this.tokens.get(sessionId);
    
    if (!storedToken) {
      return false;
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      this.tokens.delete(sessionId);
      return false;
    }

    return storedToken.token === token;
  }

  /**
   * Delete CSRF token for a session (logout)
   */
  deleteToken(sessionId: string): boolean {
    return this.tokens.delete(sessionId);
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    
    for (const [sessionId, tokenData] of this.tokens.entries()) {
      if (now > tokenData.expiresAt) {
        this.tokens.delete(sessionId);
      }
    }
  }

  /**
   * Get token count (for monitoring)
   */
  getTokenCount(): number {
    this.cleanupExpiredTokens();
    return this.tokens.size;
  }
}
