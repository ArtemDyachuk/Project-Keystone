import { Controller, Get, Req, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from '../services/session.service';
import { SessionGuard } from '../guards/session.guard';

/**
 * User Controller - handles user data and session recovery
 */
@Controller('user')
export class UserController {
  constructor(
    private readonly sessionService: SessionService
  ) {
    // Simple controller focused on session management
  }

  /**
   * Get current user data with session recovery
   * GET /user/me
   */
  @UseGuards(SessionGuard)
  @Get('me')
  async getCurrentUser(@Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      // Debug: Log all cookies received
      console.log('🍪 All cookies received:', request.cookies);

      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (!sessionId) {
        return {
          success: false,
          message: 'No active session',
          authenticated: false,
          debug: {
            cookiesReceived: request.cookies,
            cookieHeader: request.headers.cookie
          }
        };
      }

      // Try to get existing session first
      const sessionData = await this.sessionService.getSession(sessionId);

      if (sessionData) {
        // Session exists and is valid
        return {
          success: true,
          authenticated: true,
          user: sessionData.user,
          sessionId: sessionData.sessionId
        };
      }

      // Session doesn't exist or expired - try to recover from Firebase
      console.log('🔄 Session not found, attempting recovery for sessionId:', sessionId);

      // In a proper implementation, we'd validate the sessionId format or store it in database
      // For now, we'll assume any cookie with "session" name is legitimate but expired
      // This means user was logged in but backend restarted and lost the session

      // Since we can't recover without additional info, we need the user to login again
      // But we can provide a better error message
      return {
        success: false,
        message: 'Session expired due to server restart. Please login again.',
        authenticated: false,
        needsReauth: true,
        debug: {
          sessionId: sessionId.substring(0, 8) + '...', // Partial ID for debugging
          reason: 'Session not found in memory (likely server restart)'
        }
      };

    } catch (error) {
      console.error('❌ Get current user failed:', error);

      return {
        success: false,
        message: 'Failed to get user data',
        authenticated: false
      };
    }
  }

  /**
   * Get user profile data
   * GET /user/profile
   */
  @Get('profile')
  async getUserProfile(@Req() request: Request & { cookies?: Record<string, string> }) {
    try {
      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      // Get session data
      const sessionData = await this.sessionService.getSession(sessionId);

      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Return detailed user profile
      return {
        success: true,
        profile: {
          uid: sessionData.user.uid,
          email: sessionData.user.email,
          displayName: sessionData.user.displayName,
          emailVerified: sessionData.user.emailVerified,
          tenantId: sessionData.user.tenantId,
          roles: sessionData.user.roles,
          sessionInfo: {
            createdAt: sessionData.user.createdAt,
            expiresAt: sessionData.user.expiresAt
          }
        }
      };
    } catch (error) {
      console.error('❌ Get user profile failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get user profile',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
