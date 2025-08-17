import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { TenantService, ITenant } from "@keystone/database";
import { FirebaseSessionGuard } from '../guards/firebase-session.guard';
import { assignUserRole, ROLES } from "@keystone/auth";
import type { Request } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Extend Request to include user property from Firebase session guard
interface AuthenticatedRequest extends Request {
  user: DecodedIdToken; // Firebase decoded user object
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
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();
      const fresh = await adminAuth.getUser(userInfo.uid);
      const claims = (fresh.customClaims as Record<string, any>) || {};
      const tenantIds: string[] = Array.isArray(claims.tenantIds) ? claims.tenantIds : [];
      if (tenantIds.length === 0) return [];
      return await TenantService.getTenantsByIds(tenantIds);
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

          // Use new RBAC system to assign tenant_owner role
          const mongoTenantId = tenant._id as string;
          await assignUserRole(userInfo.uid, mongoTenantId, ROLES.TENANT_OWNER, "system");
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
  @UseGuards(FirebaseSessionGuard)
  async getUserTenants(@Req() req: AuthenticatedRequest): Promise<{
    tenants: ITenant[];
    selectedTenantId: string | null;
  }> {
    try {
      // User info is already verified and attached by FirebaseSessionGuard
      const userInfo = req.user;

      // If custom claims are missing, try to get them directly from Firebase
      if (!userInfo.customClaims) {
        try {
          const { getFirebaseAdminAuth } = await import("@keystone/auth");
          const adminAuth = getFirebaseAdminAuth();
          const userRecord = await adminAuth.getUser(userInfo.uid);

          // Update the userInfo with fresh custom claims
          userInfo.customClaims = userRecord.customClaims;
        } catch (firebaseError) {
          console.warn("⚠️ Failed to get fresh custom claims:", firebaseError);
        }
      }

      // Read tenant IDs from fresh Admin SDK custom claims
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();
      const fresh = await adminAuth.getUser(userInfo.uid);
      const claims = (fresh.customClaims as Record<string, any>) || {};
      const tenantIds: string[] = Array.isArray(claims.tenantIds) ? claims.tenantIds : [];
      const selectedTenantId: string | null = claims.selectedTenantId || null;

      const tenants: ITenant[] = [];
      for (const tenantId of tenantIds) {
        try {
          const tenant = await TenantService.getTenantById(tenantId);
          if (tenant) tenants.push(tenant);
        } catch (e) {
          console.warn(`Failed to fetch tenant ${tenantId}:`, e);
        }
      }

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
        const { getFirebaseAdminAuth } = await import("@keystone/auth");
        const adminAuth = getFirebaseAdminAuth();

        // Get all users and remove this tenant from their claims
        const users = await adminAuth.listUsers();

        for (const user of users.users) {
          if (user.customClaims?.tenantIds?.includes(id)) {
            const currentClaims = user.customClaims || {};
            const newTenantIds = currentClaims.tenantIds.filter((tid: string) => tid !== id);
            const newTenantRoles = { ...currentClaims.tenantRoles };
            delete newTenantRoles[id];

            // Update selectedTenantId if it was this tenant
            let newSelectedTenantId = currentClaims.selectedTenantId;
            if (newSelectedTenantId === id) {
              newSelectedTenantId = newTenantIds.length > 0 ? newTenantIds[0] : null;
            }

            await adminAuth.setCustomUserClaims(user.uid, {
              ...currentClaims,
              tenantIds: newTenantIds,
              tenantRoles: newTenantRoles,
              selectedTenantId: newSelectedTenantId,
            });
          }
        }
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




}
