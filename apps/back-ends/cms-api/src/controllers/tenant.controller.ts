import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Req, Res } from '@nestjs/common';
import { TenantService, ITenant } from "@keystone/database";
import { FirebaseSessionGuard } from '../guards/firebase-session.guard';
import { SessionGuard } from '../guards/session.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { SkipCsrf } from '../guards/csrf.guard';
import { RateLimit } from '../decorators/rate-limit.decorator';
import { ROLES } from "@keystone/auth";
import { sessionStore } from '../lib/session/session.store';
import { getSessionConfig } from '../lib/session/session.config';
import { clearUserSession } from '../lib/session/session.helper';
import { SkipTenantEnforcement } from '../interceptors/tenant-enforcement.interceptor';
import type { Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Extend Request to include user property from Firebase session guard
interface AuthenticatedRequest extends Request {
  user: DecodedIdToken; // Firebase decoded user object
  sessionCtx?: any; // Session context from SessionGuard
  sessionId?: string; // Session ID
}

// DTOs for request validation
export class CreateTenantDto {
  name!: string; // Using definite assignment assertion since this will be validated
}

export class UpdateTenantDto {
  name?: string;
}

export class RefreshTokenDto {
  refreshToken!: string;
}

export class SwitchTenantDto {
  tenantId!: string;
}

@Controller('tenants')
export class TenantController {
  constructor() { }

  /**
   * Get all tenants (filtered by user)
   * GET /tenants
   */
  @Get()
  @UseGuards(FirebaseSessionGuard)
  async getAllTenants(@Req() req: AuthenticatedRequest): Promise<ITenant[]> {
    try {
      const userInfo = req.user;
      // Get user's tenants from TenantMember collection (no more custom claims)
      const userTenants = await TenantService.getUserTenants(userInfo.uid);
      return userTenants.map(ut => ut.tenant);
    } catch (error) {
      throw new HttpException(
        `Failed to fetch tenants: ${error instanceof Error ? error.message : "Unknown error"}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get tenant by ID
   * GET /tenants/:id
   */
  @Get(':id')
  @UseGuards(FirebaseSessionGuard)
  async getTenantById(@Param('id') id: string): Promise<ITenant> {
    try {
      const tenant = await TenantService.getTenantById(id);

      if (!tenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return tenant;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to fetch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Create new tenant and associate with user
   * POST /tenants
   */
  @Post()
  @UseGuards(FirebaseSessionGuard)
  @SkipCsrf() // Tenant creation doesn't require CSRF since user has no tenant context yet
  async createTenant(@Body() createTenantDto: CreateTenantDto, @Req() req: AuthenticatedRequest): Promise<ITenant & { message?: string; requiresReauth?: boolean; firebaseError?: string; sessionCookie?: string }> {
    try {
      // 1. Create tenant in database
      const tenant = await TenantService.createTenant(createTenantDto.name);

      // 2. User info is already verified and attached by FirebaseSessionGuard
      const userInfo = req.user;

      // 3. Try to create Firebase Auth tenant (GIP multi-tenancy)
      let firebaseTenantId: string | null = null;
      try {
        // First, create the tenant in Firebase Auth (Google Cloud)
        const { createFirebaseAuthTenant } = await import("@keystone/auth");
        const firebaseTenant = await createFirebaseAuthTenant({
          displayName: createTenantDto.name.trim(),
          allowPasswordSignUp: true,
          allowEmailLinkSignIn: false,
        });

        firebaseTenantId = firebaseTenant.tenantId;

        // Now ensure the creator exists in THIS tenant and assign role in tenant context
        try {
          const { getFirebaseAdminAuth } = await import("@keystone/auth");
          const adminAuth = getFirebaseAdminAuth();
          const tenantManager = (adminAuth as any).tenantManager?.();
          if (!tenantManager) {
            throw new Error("Firebase Auth tenant manager not available. Enable GIP multi-tenancy.");
          }
          const tenantAuth = tenantManager.authForTenant(firebaseTenantId);

          // Ensure user exists in tenant by email
          const creatorEmail = userInfo.email;
          if (!creatorEmail) {
            throw new Error("Creator email not present on session token");
          }

          let tenantUser;
          try {
            tenantUser = await tenantAuth.getUserByEmail(creatorEmail);
          } catch {
            tenantUser = await tenantAuth.createUser({ email: creatorEmail, emailVerified: true });
          }

          // Assign owner/admin role inside tenant context
          await tenantAuth.setCustomUserClaims(tenantUser.uid, { role: "owner" });

          // Use TenantService to assign tenant_owner role (no more Firebase custom claims)
          const mongoTenantId = tenant._id as string;
          await TenantService.addMember(mongoTenantId, userInfo.uid, ROLES.TENANT_OWNER);

          console.log(`✅ Added user ${userInfo.uid} as owner of ${tenant.name} using TenantService`);

          // Also create TenantMember record for the new multi-tenancy system
          try {
            await TenantService.addMember(mongoTenantId, userInfo.uid, ROLES.TENANT_OWNER);
          } catch (memberError) {
            console.warn("⚠️ Failed to create TenantMember record:", memberError);
            // Don't fail the whole operation - the Firebase claims are the primary source
          }
        } catch (userAssignmentError) {
          console.error("❌ Failed to ensure creator/assign role in tenant:", userAssignmentError);
        }

        // Update MongoDB tenant with Firebase tenant ID
        if (firebaseTenantId) {
          try {
            const updatedTenant = await TenantService.updateTenant(tenant._id!, {
              firebaseTenantId: firebaseTenantId
            });
            if (updatedTenant) {
              // Update the tenant object to include the Firebase tenant ID
              tenant.firebaseTenantId = firebaseTenantId;
            }
          } catch (updateError) {
            console.warn("⚠️ Failed to save Firebase tenant ID to MongoDB:", updateError);
            // Don't fail the whole operation - tenant exists in MongoDB
          }
        }
      } catch (firebaseError) {
        console.error("❌ Firebase Auth tenant creation failed:", firebaseError);
        // Continue without Firebase Auth tenant - MongoDB tenant still exists
      }

      // 4. Respond success
      return {
        ...tenant,
        message: "Tenant created successfully. You are the owner.",
        requiresReauth: true, // Signal that session refresh is needed
        firebaseTenantId: firebaseTenantId || undefined,
      };
    } catch (error) {
      console.error('❌ Tenant creation failed:', error);
      throw new HttpException(
        `Failed to create tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Get user's tenants from Firebase
   * GET /tenants/user/me
   */
  @Get('user/me')
  @UseGuards(FirebaseSessionGuard, SessionGuard)
  async getUserTenants(@Req() req: AuthenticatedRequest): Promise<{
    tenants: ITenant[];
    selectedTenantId: string | null;
  }> {
    try {
      // Get user's tenants from TenantMember collection (no more custom claims)
      const userInfo = req.user;
      const userTenants = await TenantService.getUserTenants(userInfo.uid);

      const tenants = userTenants.map(ut => ut.tenant);

      // Selected tenant comes from current session context
      const selectedTenantId = req.sessionCtx?.tenantId || null;

      return { tenants, selectedTenantId };
    } catch (error) {
      throw new HttpException(
        `Failed to fetch user tenants: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Update tenant
   * PUT /tenants/:id
   */
  @Put(':id')
  @UseGuards(FirebaseSessionGuard)
  async updateTenant(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto
  ): Promise<ITenant> {
    try {
      const updatedTenant = await TenantService.updateTenant(id, updateTenantDto);

      if (!updatedTenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      return updatedTenant;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Delete tenant
   * DELETE /tenants/:id
   */
  @Delete(':id')
  @UseGuards(FirebaseSessionGuard)
  async deleteTenant(
    @Param('id') id: string,
    @Req() _req: AuthenticatedRequest
  ): Promise<{ message: string }> {
    try {
      // 1. Get tenant info before deletion to get Firebase tenant ID
      const tenant = await TenantService.getTenantById(id);
      if (!tenant) {
        throw new HttpException(
          `Tenant with ID "${id}" not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // 2. Delete Firebase Auth tenant if it exists
      if (tenant.firebaseTenantId) {
        try {
          const { deleteFirebaseAuthTenant } = await import("@keystone/auth");
          await deleteFirebaseAuthTenant(tenant.firebaseTenantId);
        } catch (firebaseError) {
          console.warn("⚠️ Failed to delete Firebase Auth tenant:", firebaseError);
          // Continue - tenant will still be deleted from database
        }
      }

      // 3. Remove tenant from all users' custom claims
      try {
        // Remove all tenant memberships for this tenant (no more custom claims)
        const tenantMembers = await TenantService.getTenantMembers(id);
        for (const member of tenantMembers) {
          await TenantService.removeMember(member.userId, id);
        }
        console.log(`✅ Removed ${tenantMembers.length} tenant memberships`);
      } catch (claimsError) {
        console.warn("⚠️ Failed to update user claims:", claimsError);
        // Continue - tenant will still be deleted from database
      }

      // 4. Delete tenant from database
      const deleted = await TenantService.deleteTenant(id);

      if (!deleted) {
        throw new HttpException(
          `Failed to delete tenant from database`,
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return { message: `Tenant with ID "${id}" deleted successfully` };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Check if tenant name exists
   * GET /tenants/check/:name
   */
  @Get('check/:name')
  async checkTenantExists(@Param('name') name: string): Promise<{ exists: boolean; name: string }> {
    try {
      const exists = await TenantService.tenantExists(name);
      return { exists, name };
    } catch (error) {
      throw new HttpException(
        `Failed to check tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Switch user's active tenant
   * POST /tenants/switch
   */
  @Post('switch')
  @UseGuards(FirebaseSessionGuard, SessionGuard, RateLimitGuard)
  @SkipTenantEnforcement()
  @RateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 switches per minute per user/IP
    keyGenerator: (req) => `tenant_switch:${req.user?.uid || 'anonymous'}:${req.ip}`
  })
  async switchTenant(
    @Body() switchTenantDto: SwitchTenantDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ message: string; tenantId: string; role: string }> {
    const startTime = Date.now();

    try {
      const { tenantId } = switchTenantDto;
      const userInfo = req.user;

      if (!tenantId) {
        throw new HttpException('Tenant ID is required', HttpStatus.BAD_REQUEST);
      }

      // Get target tenant and its GIP tenant ID first
      const targetTenant = await TenantService.getTenantById(tenantId);
      if (!targetTenant) {
        throw new HttpException('Target tenant not found', HttpStatus.NOT_FOUND);
      }

      const firebaseTenantId = (targetTenant as any)?.firebaseTenantId as string | undefined;

      // Check if user is a member of this tenant
      const membership = await TenantService.getMembership(userInfo.uid, tenantId);

      if (!membership) {
        throw new HttpException(
          'Access denied: You are not a member of this tenant',
          HttpStatus.FORBIDDEN
        );
      }

      // Check for idempotency - if already on target tenant, return success without rotation
      if (req.sessionCtx?.tenantId === tenantId && req.sessionCtx?.firebaseTenantId === firebaseTenantId) {
        return {
          message: 'Already on target tenant',
          tenantId,
          role: membership.roles?.[0] || 'tenant_user', // Use first role for backward compatibility
        };
      }

      // For GIP tenants, require re-authentication instead of silent switching
      if (firebaseTenantId && req.sessionCtx?.firebaseTenantId !== firebaseTenantId) {
        console.log(`🔐 GIP tenant switch requires re-authentication`);
        console.log(`   Current GIP tenant: ${req.sessionCtx?.firebaseTenantId}`);
        console.log(`   Target GIP tenant: ${firebaseTenantId}`);
        console.log(`   Target app tenant: ${tenantId}`);
        
        // Return 401 with re-auth required payload
        throw new HttpException({
          code: 'REAUTH_REQUIRED',
          message: 'Re-authentication required for GIP tenant switch',
          gipTenantId: firebaseTenantId,
          appTenantId: tenantId,
        }, HttpStatus.UNAUTHORIZED);
      }

      // For non-GIP tenants (legacy), allow direct switching
      console.log('ℹ️ Non-GIP tenant - allowing direct app-level switching');

      // Update Redis session with new tenant context
      const updateSuccess = await sessionStore.updateSession(req.sessionId!, {
        tenantId: tenantId,
        roles: membership.roles,
        firebaseTenantId: firebaseTenantId,
        firebaseUid: req.user.uid, // Keep current Firebase UID for non-GIP tenants
        lastSeen: Date.now(),
      });

      if (!updateSuccess) {
        throw new HttpException('Failed to update session', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Log the tenant context that was stored
      console.log(`🔍 Tenant Context Stored in Redis:`);
      console.log(`   - firebaseTenantId: ${firebaseTenantId}`);
      console.log(`   - firebaseUid: ${req.user.uid}`);
      console.log(`   - appTenantId: ${tenantId}`);
      console.log(`   - userRoles: ${membership.roles?.join(', ')}`);
      console.log(`   - sessionId: ${req.sessionId}`);

      // Rotate session ID for security (defense-in-depth)
      const rotateResult = await sessionStore.rotateSession(req.sessionId!);

      if (!rotateResult) {
        throw new HttpException('Failed to rotate session', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Set new session cookie
      const sessionConfig = getSessionConfig();
      res.cookie(sessionConfig.cookieName, rotateResult.newSid, sessionConfig.cookieOptions);

      console.log(`✅ User ${userInfo.uid} switched to tenant ${tenantId} (${Date.now() - startTime}ms)`);

      return {
        message: 'Successfully switched tenant',
        tenantId,
        role: membership.roles?.[0] || 'tenant_user', // Return first role for backward compatibility
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to switch tenant: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Debug endpoint to show current session data
   * GET /tenants/debug/session
   */
  @Get('debug/session')
  @UseGuards(FirebaseSessionGuard, SessionGuard)
  async debugSession(@Req() req: AuthenticatedRequest): Promise<any> {
    return {
      sessionId: req.sessionId,
      sessionCtx: req.sessionCtx,
      firebase: (req as any).firebase,
      timestamp: new Date().toISOString(),
      message: 'Current session data for debugging'
    };
  }

  /**
   * Logout user and clear session
   * POST /tenants/logout
   */
  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response
  ): Promise<{ message: string }> {
    try {
      if (req.sessionId) {
        await clearUserSession(req.sessionId, res);
      }

      // Also clear CSRF cookie
      try {
        // Clear using same cookie options
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieDomain = process.env.COOKIE_DOMAIN;
        res.clearCookie('csrf_token', {
          httpOnly: false,
          secure: isProduction,
          sameSite: 'strict',
          path: '/',
          domain: cookieDomain,
        } as any);
      } catch {
        // Ignore if CSRF service not available
      }

      return { message: 'Successfully logged out' };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the cookie even if Redis fails
      const sessionConfig = getSessionConfig();
      res.clearCookie(sessionConfig.cookieName, sessionConfig.cookieOptions);
      // Best-effort CSRF cookie clear
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieDomain = process.env.COOKIE_DOMAIN;
      res.clearCookie('csrf_token', {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'strict',
        path: '/',
        domain: cookieDomain,
      } as any);

      return { message: 'Logged out with warnings' };
    }
  }

}