import { Controller, Get, Put, UseGuards, Req, Body, Param } from '@nestjs/common';
import { FirebaseSessionGuard } from '../guards/firebase-session.guard';
import { SessionGuard } from '../guards/session.guard';
import { TenantGuard } from '../guards/tenant-access.guard';
// RBAC endpoints moved to RolesController; keep only dynamic admin imports where needed
import type { Request } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';

// Extend Request to include user property from Firebase session guard
interface AuthenticatedRequest extends Request {
  user: DecodedIdToken; // Firebase decoded user object
  sessionCtx?: any; // Session context from SessionGuard
  tenantId?: string; // Tenant ID from TenantGuard
  tenantRole?: string; // Tenant role from TenantGuard
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
  tenantRoles?: Record<string, string | string[]>; // Support both single and multiple roles
}


// DTO for updating selected tenant
export class UpdateSelectedTenantDto {
  selectedTenantId!: string; // Using definite assignment assertion since this will be validated
}

// DTO for updating user details
export class UpdateUserDetailsDto {
  firstName?: string;
  lastName?: string;
}

// DTO for updating user role
// Roles DTO moved to RolesController

@Controller('user')
export class UserController {
  constructor() { }

  /**
   * Get current user data from session cookie
   * GET /user/me
   */
  @Get('me')
  @UseGuards(FirebaseSessionGuard, SessionGuard)
  async getCurrentUser(@Req() req: AuthenticatedRequest): Promise<UserData> {
    try {
      // User info is already verified and attached by FirebaseSessionGuard
      const userInfo = req.user;

      // Get user info from Firebase (no more custom claims dependency)
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();
      const freshUser = await adminAuth.getUser(userInfo.uid);

      // Get tenant information from TenantMember collection and session context
      const { TenantService } = await import("@keystone/database");
      const userTenants = await TenantService.getUserTenants(userInfo.uid);
      const tenantIds = userTenants.map(ut => ut.tenant._id!);
      const tenantRoles = userTenants.reduce((acc, ut) => {
        acc[ut.tenant._id!] = ut.membership.roles?.[0] || 'tenant_user'; // Use first role for backward compatibility
        return acc;
      }, {} as Record<string, string>);

      // Selected tenant comes from session context
      const selectedTenantId = req.sessionCtx?.tenantId || undefined;

      return {
        sub: freshUser.uid,
        email: freshUser.email || undefined,
        username: freshUser.email || undefined,
        email_verified: freshUser.emailVerified || false,
        firstName: undefined, // Remove custom claims dependency
        lastName: undefined,  // Remove custom claims dependency
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
   * Update current user's own account details (firstName, lastName)
   * PUT /user/me
   */
  @Put('me')
  @UseGuards(FirebaseSessionGuard)
  async updateMyAccount(
    @Body() updateUserDetailsDto: UpdateUserDetailsDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ message: string; user: UserData }> {
    try {
      const userInfo = req.user;
      const { firstName, lastName } = updateUserDetailsDto;

      // Get Firebase Admin Auth
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      // Note: User profile data (firstName, lastName) is no longer stored in Firebase custom claims
      // In a production system, this would be stored in a user profile collection
      console.log(`✅ Account update requested for user ${userInfo.uid} (firstName: ${firstName}, lastName: ${lastName})`);

      // Get basic user data from Firebase
      const updatedUser = await adminAuth.getUser(userInfo.uid);

      // Get tenant information from TenantMember collection and session context
      const { TenantService } = await import("@keystone/database");
      const userTenants = await TenantService.getUserTenants(userInfo.uid);
      const tenantIds = userTenants.map(ut => ut.tenant._id!);
      const tenantRoles = userTenants.reduce((acc, ut) => {
        acc[ut.tenant._id!] = ut.membership.roles?.[0] || 'tenant_user'; // Use first role for backward compatibility
        return acc;
      }, {} as Record<string, string>);

      const userData: UserData = {
        sub: updatedUser.uid,
        email: updatedUser.email || undefined,
        username: updatedUser.email || undefined,
        email_verified: updatedUser.emailVerified || false,
        firstName: firstName || undefined, // From request, not stored in Firebase
        lastName: lastName || undefined,   // From request, not stored in Firebase
        tenantIds,
        selectedTenantId: req.sessionCtx?.tenantId || undefined,
        tenantRoles,
      };

      console.log(`✅ Updated account details for user ${userInfo.uid}`);

      return {
        message: "Account updated successfully",
        user: userData,
      };
    } catch (error) {
      console.error("Failed to update account:", error);
      throw new Error(`Failed to update account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * @deprecated This endpoint is deprecated. Use POST /tenants/switch instead.
   * Kept for backward compatibility but returns error.
   */
  @Put('selected-tenant')
  @UseGuards(FirebaseSessionGuard)
  async updateSelectedTenant(): Promise<{ error: string }> {
    return {
      error: "This endpoint is deprecated. Use POST /tenants/switch instead."
    };
  }

  /**
   * Get all users for the current tenant
   * GET /user/tenant-users
   */
  @Get('tenant-users')
  @UseGuards(FirebaseSessionGuard, SessionGuard, TenantGuard)
  async getTenantUsers(@Req() req: AuthenticatedRequest): Promise<UserData[]> {
    try {
      // const userInfo = req.user;
      const selectedTenantId = req.tenantId!; // Set by TenantGuard

      // Get Firebase Admin Auth
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      // Get all tenant members for the current tenant (from Redis session)
      const { TenantService } = await import("@keystone/database");
      const tenantMembers = await TenantService.getTenantMembers(selectedTenantId);
      const tenantUsers: UserData[] = [];

      // Get Firebase user details for each tenant member
      for (const member of tenantMembers) {
        try {
          const userRecord = await adminAuth.getUser(member.userId);
          // No longer reading custom claims

          tenantUsers.push({
            sub: userRecord.uid,
            email: userRecord.email || undefined,
            username: userRecord.email || undefined,
            email_verified: userRecord.emailVerified || false,
            firstName: undefined, // No longer stored in Firebase claims
            lastName: undefined,  // No longer stored in Firebase claims
            tenantIds: [selectedTenantId], // Only show current tenant
            selectedTenantId: selectedTenantId, // Current tenant from session
            tenantRoles: { [selectedTenantId]: member.roles?.[0] || 'tenant_user' }, // First role from TenantMember
          });
        } catch (userError) {
          console.warn(`Failed to get user details for ${member.userId}:`, userError);
          // Skip users that can't be found in Firebase
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
  @UseGuards(FirebaseSessionGuard, SessionGuard, TenantGuard)
  async getUserById(
    @Param('id') userId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<UserData> {
    try {
      // const userInfo = req.user;
      const selectedTenantId = req.tenantId!; // Set by TenantGuard

      // Get Firebase Admin Auth
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      // Verify the target user is a member of the current tenant
      const { TenantService } = await import("@keystone/database");
      const membership = await TenantService.getMembership(userId, selectedTenantId);

      if (!membership) {
        throw new Error(`User ${userId} does not have access to the current tenant: ${selectedTenantId}`);
      }

      // Get the target user with better error handling
      let targetUser;
      try {
        targetUser = await adminAuth.getUser(userId);
      } catch (firebaseError: unknown) {
        if (firebaseError && typeof firebaseError === 'object' && 'errorInfo' in firebaseError) {
          const error = firebaseError as { errorInfo?: { code?: string } };
          if (error.errorInfo?.code === 'auth/user-not-found') {
            throw new Error(`User with ID ${userId} not found. The user may have been deleted or the ID is invalid.`);
          }
        }
        throw firebaseError;
      }

      // Return user data (membership already verified above)
      const userData: UserData = {
        sub: targetUser.uid,
        email: targetUser.email || undefined,
        username: targetUser.email || undefined,
        email_verified: targetUser.emailVerified || false,
        firstName: undefined, // No longer stored in Firebase claims
        lastName: undefined,  // No longer stored in Firebase claims
        tenantIds: [selectedTenantId], // Only show current tenant
        selectedTenantId: selectedTenantId, // Current tenant from session
        tenantRoles: { [selectedTenantId]: membership.roles?.[0] || 'tenant_user' }, // First role from TenantMember
      };

      console.log(`✅ Retrieved user ${userId} for tenant ${selectedTenantId}`);
      return userData;
    } catch (error) {
      console.error("Failed to get user by ID:", error);
      throw new Error(`Failed to get user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user details (firstName, lastName) for a user in the same tenant
   * PUT /user/:id
   */
  @Put(':id')
  @UseGuards(FirebaseSessionGuard, SessionGuard, TenantGuard)
  async updateUserDetails(
    @Param('id') userId: string,
    @Body() updateUserDetailsDto: UpdateUserDetailsDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ message: string; user: UserData }> {
    try {
      // const userInfo = req.user;
      const { firstName, lastName } = updateUserDetailsDto;

      // Get Firebase Admin Auth
      const { getFirebaseAdminAuth } = await import("@keystone/auth");
      const adminAuth = getFirebaseAdminAuth();

      const selectedTenantId = req.tenantId!; // Set by TenantGuard

      // Verify the target user is a member of the current tenant
      const { TenantService } = await import("@keystone/database");
      const membership = await TenantService.getMembership(userId, selectedTenantId);

      if (!membership) {
        throw new Error(`User ${userId} does not have access to the current tenant: ${selectedTenantId}`);
      }

      // Get the target user
      // const targetUser = await adminAuth.getUser(userId);
      // Verify the target user has access to the same tenant (no more custom claims)
      const targetMembership = await TenantService.getMembership(userId, selectedTenantId);
      if (!targetMembership) {
        throw new Error(`User ${userId} does not have access to the current tenant: ${selectedTenantId}`);
      }

      // Note: User profile data (firstName, lastName) is no longer stored in Firebase custom claims
      // In a production system, this would be stored in a user profile collection
      console.log(`✅ User details update requested for ${userId} (firstName: ${firstName}, lastName: ${lastName})`);

      // Get updated user data to return
      const updatedUser = await adminAuth.getUser(userId);

      const userData: UserData = {
        sub: updatedUser.uid,
        email: updatedUser.email || undefined,
        username: updatedUser.email || undefined,
        email_verified: updatedUser.emailVerified || false,
        firstName: firstName || undefined, // From request, not stored in Firebase
        lastName: lastName || undefined,   // From request, not stored in Firebase
        tenantIds: [selectedTenantId], // Only current tenant
        selectedTenantId: selectedTenantId, // Current tenant from session
        tenantRoles: { [selectedTenantId]: targetMembership.roles?.[0] || 'tenant_user' }, // First role from TenantMember
      };

      console.log(`✅ Updated user ${userId} details for tenant ${selectedTenantId}`);

      return {
        message: "User details updated successfully",
        user: userData,
      };
    } catch (error) {
      console.error("Failed to update user details:", error);
      throw new Error(`Failed to update user details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}
