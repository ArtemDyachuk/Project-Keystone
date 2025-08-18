import { Controller, Post, Get, UseGuards, Req, Res, Body, HttpException, HttpStatus } from '@nestjs/common';
import { FirebaseSessionGuard } from '../guards/firebase-session.guard';
import { SessionGuard } from '../guards/session.guard';
import { CsrfGuard } from '../guards/csrf.guard';
import { SkipCsrf } from '../guards/csrf.guard';
import { sessionStore } from '../lib/session/session.store';
import { clearUserSession, createUserSession } from '../lib/session/session.helper';
import type { Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';

interface AuthenticatedRequest extends Request {
  user: DecodedIdToken;
  sessionCtx?: any;
  sessionId?: string;
}

@Controller('sessions')
export class SessionsController {
  /**
   * Bootstrap Redis session after Firebase authentication
   * POST /sessions/bootstrap
   * 
   * Accepts: { expectedGipTenantId?: string } in body for tenant-scoped re-auth
   */
  @Post('bootstrap')
  @SkipCsrf() // Called internally from sign-in flow
  @UseGuards(FirebaseSessionGuard) // Only Firebase auth needed, no Redis session yet
  async bootstrapSession(
    @Body() body: { expectedGipTenantId?: string },
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const deviceId = req.get('User-Agent') || 'unknown';
      // If the cookie is tenant-scoped, decoded token will include firebase.tenant
      const firebaseTenantId = (req as any).firebase?.tenant as string | undefined;
      const firebaseUid = req.user.uid;

      // Validate expected GIP tenant if provided
      if (body.expectedGipTenantId && firebaseTenantId !== body.expectedGipTenantId) {
        throw new HttpException(
          `Firebase session cookie tenant mismatch. Expected: ${body.expectedGipTenantId}, Got: ${firebaseTenantId}`,
          HttpStatus.UNAUTHORIZED
        );
      }

      // For GIP tenant-scoped sessions, we need to find the app tenant and user roles
      let appTenantId: string | undefined;
      let userRoles: string[] = [];

      if (firebaseTenantId) {
        // Find the app tenant that corresponds to this GIP tenant
        const { TenantService } = await import("@keystone/database");
        const tenants = await TenantService.getUserTenants(firebaseUid);
        
        const matchingTenant = tenants.find(ut => 
          (ut.tenant as any)?.firebaseTenantId === firebaseTenantId
        );
        
        if (matchingTenant) {
          appTenantId = matchingTenant.tenant._id as string;
          userRoles = matchingTenant.membership.roles || [];
          console.log(`✅ Found app tenant ${appTenantId} for GIP tenant ${firebaseTenantId}`);
          console.log(`✅ User roles: ${userRoles.join(', ')}`);
        } else {
          console.warn(`⚠️ No app tenant found for GIP tenant ${firebaseTenantId}`);
        }
      }

      const { sid, defaultTenantId } = await createUserSession(
        firebaseUid,
        res,
        { 
          deviceId, 
          firebaseTenantId, 
          firebaseUid,
          tenantId: appTenantId, // Set the app tenant if found
          roles: userRoles.length > 0 ? userRoles : undefined
        }
      );

      return {
        success: true,
        sessionId: sid,
        tenantId: appTenantId || defaultTenantId,
        defaultTenantId,
        firebaseTenantId,
        roles: userRoles,
        message: firebaseTenantId 
          ? 'Tenant-scoped Redis session created successfully'
          : 'Redis session created successfully',
      };
    } catch (error) {
      console.error('Failed to bootstrap session:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create session', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  /**
   * Get current user's active sessions
   * GET /sessions
   */
  @Get()
  @UseGuards(FirebaseSessionGuard, SessionGuard, CsrfGuard)
  async getUserSessions(@Req() req: AuthenticatedRequest) {
    try {
      const sessions = await sessionStore.getUserSessions(req.user.uid);
      
      // Format sessions for client consumption
      const formattedSessions = sessions.map(({ sid, data }) => ({
        sessionId: sid,
        isCurrentSession: sid === req.sessionId,
        tenantId: data.tenantId,
        roles: data.roles,
        deviceId: data.deviceId,
        issuedAt: new Date(data.issuedAt).toISOString(),
        lastSeen: new Date(data.lastSeen).toISOString(),
        mfaStrongUntil: data.mfaStrongUntil ? new Date(data.mfaStrongUntil).toISOString() : null,
      }));

      return {
        sessions: formattedSessions,
        total: formattedSessions.length,
      };
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      throw new Error('Failed to retrieve sessions');
    }
  }

  /**
   * Revoke all sessions for current user
   * POST /sessions/revoke-all
   */
  @Post('revoke-all')
  @UseGuards(FirebaseSessionGuard, SessionGuard, CsrfGuard)
  async revokeAllSessions(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const deletedCount = await sessionStore.deleteUserSessions(req.user.uid);
      
      // Clear current session cookie since all sessions are revoked
      await clearUserSession(req.sessionId!, res);

      return {
        message: 'All sessions revoked successfully',
        revokedSessions: deletedCount,
      };
    } catch (error) {
      console.error('Failed to revoke all sessions:', error);
      throw new Error('Failed to revoke sessions');
    }
  }

  /**
   * Revoke all other sessions (keep current session active)
   * POST /sessions/revoke-others
   */
  @Post('revoke-others')
  @UseGuards(FirebaseSessionGuard, SessionGuard, CsrfGuard)
  async revokeOtherSessions(@Req() req: AuthenticatedRequest) {
    try {
      const currentSessionId = req.sessionId!;
      const allSessions = await sessionStore.getUserSessions(req.user.uid);
      
      let revokedCount = 0;
      for (const { sid } of allSessions) {
        if (sid !== currentSessionId) {
          await sessionStore.deleteSession(sid);
          revokedCount++;
        }
      }

      return {
        message: 'Other sessions revoked successfully',
        revokedSessions: revokedCount,
        currentSessionPreserved: true,
      };
    } catch (error) {
      console.error('Failed to revoke other sessions:', error);
      throw new Error('Failed to revoke other sessions');
    }
  }
}
