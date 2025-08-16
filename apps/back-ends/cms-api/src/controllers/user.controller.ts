import { Controller, Get, Put, UseGuards, Req, Body, Param } from '@nestjs/common';
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

// Firebase Custom Claims interface
interface FirebaseCustomClaims {
  tenantIds?: string[];
  selectedTenantId?: string;
  tenantRoles?: Record<string, string>;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
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
      const customClaims = (freshUser.customClaims as FirebaseCustomClaims) || {};
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
      const currentClaims = (freshUser.customClaims as FirebaseCustomClaims) || {};
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

  /**
   * Get all users for the current tenant
   * GET /user/tenant-users
   */
  @Get('tenant-users')
  @UseGuards(FirebaseSessionGuard)
  async getTenantUsers(@Req() req: AuthenticatedRequest): Promise<UserData[]> {
    try {
      const userInfo = req.user;

      // Get Firebase Admin Auth
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      // Get current user's claims to determine selected tenant
      const freshUser = await adminAuth.getUser(userInfo.uid);
      const currentClaims = (freshUser.customClaims as FirebaseCustomClaims) || {};
      const selectedTenantId = currentClaims.selectedTenantId;

      if (!selectedTenantId) {
        throw new Error("No tenant selected. Please select a tenant first.");
      }

      // Verify user has access to the selected tenant
      const tenantIds: string[] = Array.isArray(currentClaims.tenantIds) ? currentClaims.tenantIds : [];
      if (!tenantIds.includes(selectedTenantId)) {
        throw new Error(`User does not have access to tenant: ${selectedTenantId}`);
      }

      // Get all users and filter by selected tenant
      const listUsersResult = await adminAuth.listUsers();
      const tenantUsers: UserData[] = [];

      for (const userRecord of listUsersResult.users) {
        const userClaims = (userRecord.customClaims as FirebaseCustomClaims) || {};
        const userTenantIds: string[] = Array.isArray(userClaims.tenantIds) ? userClaims.tenantIds : [];
        
        // Check if this user has access to the selected tenant
        if (userTenantIds.includes(selectedTenantId)) {
          tenantUsers.push({
            sub: userRecord.uid,
            email: userRecord.email || undefined,
            username: userRecord.email || undefined,
            email_verified: userRecord.emailVerified || false,
            firstName: userClaims.firstName || undefined,
            lastName: userClaims.lastName || undefined,
            tenantIds: userTenantIds,
            selectedTenantId: userClaims.selectedTenantId,
            tenantRoles: userClaims.tenantRoles || {},
          });
        }
      }

      console.log(`✅ Retrieved ${tenantUsers.length} users for tenant ${selectedTenantId}`);
      return tenantUsers;
    } catch (error) {
      console.error("Failed to get tenant users:", error);
      throw new Error(`Failed to get tenant users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user by ID (must be in same tenant)
   * GET /user/:id
   */
  @Get(':id')
  @UseGuards(FirebaseSessionGuard)
  async getUserById(
    @Param('id') userId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<UserData> {
    try {
      const userInfo = req.user;

      // Get Firebase Admin Auth
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      // Get current user's claims to determine selected tenant
      const freshUser = await adminAuth.getUser(userInfo.uid);
      const currentClaims = (freshUser.customClaims as FirebaseCustomClaims) || {};
      const selectedTenantId = currentClaims.selectedTenantId;

      if (!selectedTenantId) {
        throw new Error("No tenant selected. Please select a tenant first.");
      }

      // Verify current user has access to the selected tenant
      const tenantIds: string[] = Array.isArray(currentClaims.tenantIds) ? currentClaims.tenantIds : [];
      if (!tenantIds.includes(selectedTenantId)) {
        throw new Error(`User does not have access to tenant: ${selectedTenantId}`);
      }

      // Get the target user
      const targetUser = await adminAuth.getUser(userId);
      const targetUserClaims = (targetUser.customClaims as FirebaseCustomClaims) || {};
      const targetUserTenantIds: string[] = Array.isArray(targetUserClaims.tenantIds) ? targetUserClaims.tenantIds : [];

      // Verify the target user has access to the same tenant
      if (!targetUserTenantIds.includes(selectedTenantId)) {
        throw new Error(`User ${userId} does not have access to the current tenant: ${selectedTenantId}`);
      }

      // Return user data
      const userData: UserData = {
        sub: targetUser.uid,
        email: targetUser.email || undefined,
        username: targetUser.email || undefined,
        email_verified: targetUser.emailVerified || false,
        firstName: targetUserClaims.firstName || undefined,
        lastName: targetUserClaims.lastName || undefined,
        tenantIds: targetUserTenantIds,
        selectedTenantId: targetUserClaims.selectedTenantId,
        tenantRoles: targetUserClaims.tenantRoles || {},
      };

      console.log(`✅ Retrieved user ${userId} for tenant ${selectedTenantId}`);
      return userData;
    } catch (error) {
      console.error("Failed to get user by ID:", error);
      throw new Error(`Failed to get user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
