import { Controller, Get, Post, Put, Delete, Req, Body, Param, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SessionService } from '../services/session.service';
import { SessionGuard } from '../guards/session.guard';
import { UserService } from '../services/user.service';
import { InviteService } from '../services/invite.service';
import type { CreateInviteDto } from '../services/invite.service';
import { RbacGuard } from '../guards/rbac.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import type { CreateUserRequest, UpdateUserRequest } from '../services/user.service';

/**
 * User Controller - handles user data and session recovery
 */
@Controller('user')
export class UserController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
    private readonly inviteService: InviteService
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

  /**
   * Get all users in the current tenant
   * GET /user/users
   */
  @UseGuards(SessionGuard)
  @Get('users')
  async getUsers(@Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Get tenant ID directly from user's session
      const tenantId = sessionData.user.tenantId;
      if (!tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.BAD_REQUEST);
      }

      const users = await this.userService.getUsersInTenant(tenantId);
      return {
        success: true,
        ...users
      };
    } catch (error) {
      console.error('❌ Get users failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get users',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get a specific user by ID
   * GET /user/users/:id
   */
  @UseGuards(SessionGuard)
  @Get('users/:id')
  async getUserById(@Param('id') id: string, @Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Get tenant ID directly from user's session
      const tenantId = sessionData.user.tenantId;
      if (!tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userService.getUserById(id, tenantId);
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('❌ Get user by ID failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Create a new user
   * POST /user/users
   */
  @UseGuards(SessionGuard)
  @Post('users')
  async createUser(@Body() createUserRequest: CreateUserRequest, @Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Get tenant ID directly from user's session
      const tenantId = sessionData.user.tenantId;
      if (!tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.BAD_REQUEST);
      }

      // Override tenantId from request with current user's tenant
      createUserRequest.tenantId = tenantId;

      const user = await this.userService.createUser(createUserRequest);
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('❌ Create user failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update a user
   * PUT /user/users/:id
   */
  @UseGuards(SessionGuard)
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() updateUserRequest: UpdateUserRequest, @Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Get tenant ID directly from user's session
      const tenantId = sessionData.user.tenantId;
      if (!tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.UNAUTHORIZED);
      }

      const user = await this.userService.updateUser(id, updateUserRequest, tenantId);
      
      // If roles were changed, update all sessions for this user
      if (updateUserRequest.roles !== undefined) {
        // Update the current user's session if they're updating themselves
        if (id === sessionData.user.uid) {
          await this.sessionService.updateRoles(sessionId, updateUserRequest.roles);
        }
        
        // Update all other sessions for this user so they get new permissions immediately
        await this.sessionService.updateUserRoles(id, updateUserRequest.roles);
      }
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('❌ Update user failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Set user roles
   * POST /user/users/:id/roles
   */
  @UseGuards(SessionGuard)
  @Post('users/:id/roles')
  async setUserRoles(@Param('id') id: string, @Body() body: { roles: string[] }, @Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Get tenant ID directly from user's session
      const tenantId = sessionData.user.tenantId;
      if (!tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.BAD_REQUEST);
      }

      await this.userService.setUserRoles(id, body.roles, tenantId);
      
      // Update all sessions for this user so they get new permissions immediately
      await this.sessionService.updateUserRoles(id, body.roles);
      
      return {
        success: true,
        message: 'User roles updated successfully'
      };
    } catch (error) {
      console.error('❌ Set user roles failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to set user roles',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete a user
   * DELETE /user/users/:id
   */
  @UseGuards(SessionGuard)
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Get tenant ID directly from user's session
      const tenantId = sessionData.user.tenantId;
      if (!tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.BAD_REQUEST);
      }

      await this.userService.deleteUser(id, tenantId);
      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      console.error('❌ Delete user failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send user invite
   * POST /user/invite
   */
  @UseGuards(SessionGuard, RbacGuard)
  @RequirePermission('user:invite')
  @Post('invite')
  async sendInvite(@Body() inviteData: CreateInviteDto, @Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.BAD_REQUEST);
      }

      // Add the current user as the inviter
      if (!sessionData.user.tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.BAD_REQUEST);
      }

      // Create the invite using the new unified system
      await this.inviteService.createInvite(
        inviteData,
        sessionData.user.uid,
        sessionData.user.tenantId
      );

      return {
        success: true,
        message: 'Invite sent successfully',
        data: {
          email: inviteData.email,
          expiresAt: new Date(Date.now() + (15 * 60 * 1000)).toISOString(), // 15 minutes from now
        }
      };
    } catch (error) {
      console.error('❌ Send invite failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to send invite',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Cancel user invite
   * DELETE /user/invite/:id
   */
  @UseGuards(SessionGuard, RbacGuard)
  @RequirePermission('user:invite')
  @Delete('invite/:id')
  async cancelInvite(@Param('id') uid: string, @Req() request: Request & { user?: any; sessionId?: string }) {
    try {
      const sessionId = request.cookies?.session;
      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid or expired session', HttpStatus.UNAUTHORIZED);
      }

      // Get tenant ID directly from user's session
      const tenantId = sessionData.user.tenantId;
      if (!tenantId) {
        throw new HttpException('User not associated with a tenant', HttpStatus.BAD_REQUEST);
      }

      // Cancel the invite using the new unified system
      await this.inviteService.cancelInviteByUid(uid, tenantId);

      return {
        success: true,
        message: 'Invite cancelled successfully'
      };
    } catch (error) {
      console.error('❌ Cancel invite failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to cancel invite',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Admin: Invalidate all sessions for a specific user
   * POST /user/:uid/invalidate-sessions
   */
  @UseGuards(SessionGuard, RbacGuard)
  @RequirePermission('user:manage')
  @Post(':uid/invalidate-sessions')
  async invalidateUserSessions(
    @Param('uid') targetUid: string,
    @Req() request: Request & { user?: any; sessionId?: string },
    @Body() body: { reason?: string }
  ) {
    try {
      const adminUser = request.user;
      
      // Prevent admin from invalidating their own sessions
      if (adminUser.uid === targetUid) {
        return {
          success: false,
          message: 'Cannot invalidate your own sessions'
        };
      }

      // Invalidate all sessions for the target user
      const deletedCount = await this.sessionService.invalidateUserSessions(
        targetUid, 
        body.reason || `Admin ${adminUser.email} invalidated sessions`,
        adminUser.tenantId
      );

      return {
        success: true,
        message: `Successfully invalidated ${deletedCount} sessions for user ${targetUid}`,
        deletedCount,
        targetUser: targetUid
      };
    } catch (error) {
      console.error('❌ Failed to invalidate user sessions:', error);
      return {
        success: false,
        message: 'Failed to invalidate user sessions',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
