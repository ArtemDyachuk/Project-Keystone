import { Controller, Get, Put, UseGuards, Req, Body, Param } from "@nestjs/common";
import { FirebaseSessionGuard } from "../guards/firebase-session.guard";
import {
  getAvailableRoles,
  assignUserRole,
  hasPermission,
  isSuperAdmin,
  PERMISSIONS,
  type RoleDefinition,
  type UserRole,
} from "@keystone/auth";
import type { Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

interface AuthenticatedRequest extends Request {
  user: DecodedIdToken;
}

// Minimal copy of Custom Claims used in this controller
interface FirebaseCustomClaims {
  tenantIds?: string[];
  selectedTenantId?: string;
  tenantRoles?: Record<string, string | string[]>;
  [key: string]: unknown;
}

export class UpdateUserRoleDto {
  role!: UserRole;
}

@Controller("roles")
export class RolesController {
  constructor() {}

  /**
   * Get available roles for role assignment
   * GET /roles
   */
  @Get()
  @UseGuards(FirebaseSessionGuard)
  async getAvailableRoles(@Req() req: AuthenticatedRequest): Promise<RoleDefinition[]> {
    try {
      const userInfo = req.user;

      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      const freshUser = await adminAuth.getUser(userInfo.uid);
      const currentClaims = (freshUser.customClaims as FirebaseCustomClaims) || {};
      const selectedTenantId = currentClaims.selectedTenantId;

      if (!selectedTenantId) {
        throw new Error("No tenant selected. Please select a tenant first.");
      }

      if (!hasPermission(currentClaims, selectedTenantId, PERMISSIONS.USERS_ROLES)) {
        throw new Error("Insufficient permissions to view roles");
      }

      const includeSystemRoles = isSuperAdmin(currentClaims);
      const roles = getAvailableRoles(includeSystemRoles);
      console.log(`✅ Retrieved ${roles.length} available roles (system roles: ${includeSystemRoles})`);
      return roles;
    } catch (error) {
      console.error("Failed to get available roles:", error);
      throw new Error(`Failed to get available roles: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update user's role in the current tenant
   * PUT /roles/user/:id
   */
  @Put("user/:id")
  @UseGuards(FirebaseSessionGuard)
  async updateUserRole(
    @Param("id") userId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ message: string; user: any }> {
    try {
      const userInfo = req.user;
      const { role } = updateUserRoleDto;

      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      const freshUser = await adminAuth.getUser(userInfo.uid);
      const currentClaims = (freshUser.customClaims as FirebaseCustomClaims) || {};
      const selectedTenantId = currentClaims.selectedTenantId;

      if (!selectedTenantId) {
        throw new Error("No tenant selected. Please select a tenant first.");
      }

      if (!hasPermission(currentClaims, selectedTenantId, PERMISSIONS.USERS_ROLES)) {
        throw new Error("Insufficient permissions to manage user roles");
      }

      const tenantIds: string[] = Array.isArray(currentClaims.tenantIds) ? currentClaims.tenantIds : [];
      if (!tenantIds.includes(selectedTenantId)) {
        throw new Error(`User does not have access to tenant: ${selectedTenantId}`);
      }

      const targetUser = await adminAuth.getUser(userId);
      const targetUserClaims = (targetUser.customClaims as FirebaseCustomClaims) || {};
      const targetUserTenantIds: string[] = Array.isArray(targetUserClaims.tenantIds) ? targetUserClaims.tenantIds : [];

      if (!targetUserTenantIds.includes(selectedTenantId)) {
        throw new Error(`User ${userId} does not have access to the current tenant: ${selectedTenantId}`);
      }

      await assignUserRole(userId, selectedTenantId, role, userInfo.uid);

      const updatedUser = await adminAuth.getUser(userId);
      const updatedUserClaims = (updatedUser.customClaims as FirebaseCustomClaims) || {};

      const userData = {
        sub: updatedUser.uid,
        email: updatedUser.email || undefined,
        username: updatedUser.email || undefined,
        email_verified: updatedUser.emailVerified || false,
        firstName: updatedUserClaims.firstName || undefined,
        lastName: updatedUserClaims.lastName || undefined,
        tenantIds: targetUserTenantIds,
        selectedTenantId: updatedUserClaims.selectedTenantId,
        tenantRoles: updatedUserClaims.tenantRoles || {},
      };

      console.log(`✅ Updated user ${userId} role to ${role} in tenant ${selectedTenantId}`);

      return {
        message: "User role updated successfully",
        user: userData,
      };
    } catch (error) {
      console.error("Failed to update user role:", error);
      throw new Error(`Failed to update user role: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}


