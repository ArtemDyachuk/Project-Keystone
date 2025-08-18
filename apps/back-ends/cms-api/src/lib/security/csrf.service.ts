import { Injectable } from '@nestjs/common';
import { createHmac } from 'crypto';
import { Response } from 'express';

export interface CsrfConfig {
  cookieName: string;
  headerName: string;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
    path: string;
    domain?: string;
  };
}

@Injectable()
export class CsrfService {
  private readonly config: CsrfConfig;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    this.config = {
      cookieName: 'csrf_token',
      headerName: 'x-csrf-token',
      cookieOptions: {
        httpOnly: false, // Must be false so client can read it
        secure: isProduction,
        sameSite: 'strict', // Strict for CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
        domain: cookieDomain,
      },
    };
  }

  /**
   * Generate a session-bound CSRF token using HMAC
   */
  generateToken(sessionId: string): string {
    if (!sessionId) {
      throw new Error('Session ID required for CSRF token generation');
    }

    // Use session ID + timestamp for uniqueness and time-binding
    const timestamp = Date.now().toString();
    const payload = `${sessionId}:${timestamp}`;

    // Generate HMAC with a server secret (in production, use env var)
    const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    // Return: timestamp.signature (session ID not included for security)
    return `${timestamp}.${signature}`;
  }

  /**
   * Set session-bound CSRF token in cookie and return token
   */
  setTokenCookie(res: Response, sessionId: string): string {
    const token = this.generateToken(sessionId);
    res.cookie(this.config.cookieName, token, this.config.cookieOptions);
    return token;
  }

  /**
   * Validate session-bound CSRF token
   */
  validateToken(cookieToken: string, headerToken: string, sessionId: string): boolean {
    if (!cookieToken || !headerToken || !sessionId) {
      return false;
    }

    // Both tokens must match (double-submit pattern)
    if (!this.constantTimeEqual(cookieToken, headerToken)) {
      return false;
    }

    // Validate the token is properly signed for this session
    return this.verifyTokenSignature(cookieToken, sessionId);
  }

  /**
   * Verify CSRF token signature against session ID
   */
  private verifyTokenSignature(token: string, sessionId: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return false;
      }

      const [timestamp, signature] = parts;

      // Check if token is too old (1 hour max)
      const tokenTime = parseInt(timestamp, 10);
      const now = Date.now();
      if (now - tokenTime > 60 * 60 * 1000) {
        return false;
      }

      // Regenerate expected signature
      const payload = `${sessionId}:${timestamp}`;
      const secret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';
      const hmac = createHmac('sha256', secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      // Constant-time comparison
      return this.constantTimeEqual(signature, expectedSignature);
    } catch {
      return false;
    }
  }

  /**
   * Get CSRF token from request headers
   */
  getTokenFromHeader(req: any): string | undefined {
    return req.get(this.config.headerName);
  }

  /**
   * Get CSRF token from request cookies
   */
  getTokenFromCookie(req: any): string | undefined {
    return req.cookies?.[this.config.cookieName];
  }

  /**
   * Clear CSRF token cookie
   */
  clearTokenCookie(res: Response): void {
    res.clearCookie(this.config.cookieName, this.config.cookieOptions);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Get configuration for external use
   */
  getConfig(): Readonly<CsrfConfig> {
    return this.config;
  }
}
