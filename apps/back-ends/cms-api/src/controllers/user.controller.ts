import { Controller, Get, Put, UseGuards, Req, Body } from '@nestjs/common';
import { FirebaseSessionGuard } from '../guards/firebase-session.guard';
import type { Request } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Extend Request to include user property from Firebase session guard
interface AuthenticatedRequest extends Request {
  user: DecodedIdToken; // Firebase decoded user object
}

export interface UserData {
  sub: string;
  email?: string;
  username?: string;
  email_verified?: boolean;
  firstName?: string;
  lastName?: string;
  tenantIds?: string[];
  selectedTenantId?: string;
  tenantRoles?: Record<string, string>;
}

// DTO for updating selected tenant
export class UpdateSelectedTenantDto {
  selectedTenantId!: string; // Using definite assignment assertion since this will be validated
}

@Controller('user')
export class UserController {
  constructor() { }

  /**
   * Get current user data from session cookie
   * GET /user/me
   */
  @Get('me')
  @UseGuards(FirebaseSessionGuard)
  async getCurrentUser(@Req() req: AuthenticatedRequest): Promise<UserData> {
    try {
      // User info is already verified and attached by FirebaseSessionGuard
      const userInfo = req.user;

      // Get fresh custom claims from Firebase Admin SDK
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();
      const freshUser = await adminAuth.getUser(userInfo.uid);

      // Extract custom claims for tenant information
      const customClaims = (freshUser.customClaims as Record<string, any>) || {};
      const tenantIds = customClaims.tenantIds || [];
      const selectedTenantId = customClaims.selectedTenantId;
      const tenantRoles = customClaims.tenantRoles || {};

      return {
        sub: freshUser.uid,
        email: freshUser.email || undefined,
        username: freshUser.email || undefined,
        email_verified: freshUser.emailVerified || false,
        firstName: customClaims.firstName || undefined,
        lastName: customClaims.lastName || undefined,
        tenantIds,
        selectedTenantId,
        tenantRoles,
      };
    } catch (error) {
      console.error("Failed to get current user:", error);
      throw new Error(`Failed to get current user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user's selected tenant in Firebase custom claims
   * PUT /user/selected-tenant
   */
  @Put('selected-tenant')
  @UseGuards(FirebaseSessionGuard)
  async updateSelectedTenant(
    @Body() updateSelectedTenantDto: UpdateSelectedTenantDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ message: string; selectedTenantId: string }> {
    try {
      const userInfo = req.user;
      const { selectedTenantId } = updateSelectedTenantDto;

      if (!selectedTenantId) {
        throw new Error("Tenant ID is required");
      }

      // Get Firebase Admin Auth
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      // Get current user's claims to verify tenant access
      const freshUser = await adminAuth.getUser(userInfo.uid);
      const currentClaims = (freshUser.customClaims as Record<string, any>) || {};
      const tenantIds: string[] = Array.isArray(currentClaims.tenantIds) ? currentClaims.tenantIds : [];

      // Verify user has access to the selected tenant
      if (!tenantIds.includes(selectedTenantId)) {
        throw new Error(`User does not have access to tenant: ${selectedTenantId}`);
      }

      // Update custom claims with new selected tenant
      await adminAuth.setCustomUserClaims(userInfo.uid, {
        ...currentClaims,
        selectedTenantId: selectedTenantId,
      });

      console.log(`✅ Updated selected tenant for user ${userInfo.uid} to: ${selectedTenantId}`);

      return {
        message: "Selected tenant updated successfully",
        selectedTenantId: selectedTenantId,
      };
    } catch (error) {
      console.error("Failed to update selected tenant:", error);
      throw new Error(`Failed to update selected tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
