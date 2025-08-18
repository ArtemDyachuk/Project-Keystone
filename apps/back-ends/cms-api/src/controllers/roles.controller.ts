import { Controller, Get, Put, UseGuards, Req, Body, Param } from "@nestjs/common";
import { FirebaseSessionGuard } from "../guards/firebase-session.guard";
import { SessionGuard } from "../guards/session.guard";
import { TenantGuard } from "../guards/tenant-access.guard";
import {
  getAvailableRoles,
  ROLES,
  type RoleDefinition,
  type UserRole,
} from "@keystone/auth";
import { TenantService } from "@keystone/database";
import type { Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";

interface AuthenticatedRequest extends Request {
  user: DecodedIdToken;
  sessionCtx?: any;
  tenantId?: string;
  tenantRole?: string;
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
  @UseGuards(FirebaseSessionGuard, SessionGuard, TenantGuard)
  async getAvailableRoles(@Req() req: AuthenticatedRequest): Promise<RoleDefinition[]> {
    try {
      // Tenant context comes from session (no more custom claims)
      const userRole = req.tenantRole!; // Set by TenantGuard

      // Simple role-based access: only owners and admins can view roles
      if (!['tenant_owner', 'tenant_admin'].includes(userRole)) {
        throw new Error("Insufficient permissions to view roles");
      }

      // For tenant-level roles, don't include system roles
      const includeSystemRoles = userRole === 'super_admin';
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
  @UseGuards(FirebaseSessionGuard, SessionGuard, TenantGuard)
  async updateUserRole(
    @Param("id") userId: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ message: string; user: any }> {
    try {
      const userInfo = req.user;
      const { role } = updateUserRoleDto;
      
      // Tenant context comes from session (no more custom claims)
      const selectedTenantId = req.tenantId!; // Set by TenantGuard
      const userRole = req.tenantRole!; // Set by TenantGuard

      // Simple role-based access: only owners and admins can manage roles
      if (!['tenant_owner', 'tenant_admin'].includes(userRole)) {
        throw new Error("Insufficient permissions to manage user roles");
      }

      // Verify target user is a member of this tenant
      const membership = await TenantService.getMembership(userId, selectedTenantId);
      if (!membership) {
        throw new Error(`User ${userId} does not have access to the current tenant: ${selectedTenantId}`);
      }

      // Update role in TenantMember collection
      await TenantService.updateMemberRole(userId, selectedTenantId, role);

      // Get updated user data
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();
      const updatedUser = await adminAuth.getUser(userId);

      const userData = {
        sub: updatedUser.uid,
        email: updatedUser.email || undefined,
        username: updatedUser.email || undefined,
        email_verified: updatedUser.emailVerified || false,
        firstName: undefined, // No longer stored in Firebase claims
        lastName: undefined,  // No longer stored in Firebase claims
        tenantIds: [selectedTenantId], // Only current tenant
        selectedTenantId: selectedTenantId,
        tenantRoles: { [selectedTenantId]: role },
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


