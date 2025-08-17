/**
 * User Role Management Functions
 * Handles assigning and updating user roles in Firebase Custom Claims
 */

import { getFirebaseAdminAuth } from "../firebase/admin";
import { ROLES, type UserRole } from "./roles";

export interface UserRoleAssignment {
  userId: string;
  tenantId: string;
  roles: UserRole[]; // Changed from single role to array of roles
  assignedBy?: string;
  assignedAt?: Date;
}

/**
 * Assign a role to a user in a specific tenant
 */
export async function assignUserRole(
  userId: string,
  tenantId: string, 
  role: UserRole,
  assignedBy?: string
): Promise<void> {
  try {
    const adminAuth = getFirebaseAdminAuth();
    
    // Get current user claims
    const userRecord = await adminAuth.getUser(userId);
    const currentClaims = userRecord.customClaims || {};
    
    // Get existing roles for this tenant
    const existingRoles = Array.isArray(currentClaims.tenantRoles?.[tenantId]) 
      ? currentClaims.tenantRoles[tenantId] 
      : currentClaims.tenantRoles?.[tenantId] 
        ? [currentClaims.tenantRoles[tenantId]] 
        : [];
    
    // Add new role if not already present
    const updatedRoles = existingRoles.includes(role) 
      ? existingRoles 
      : [...existingRoles, role];
    
    // Update tenant roles
    const tenantRoles = {
      ...currentClaims.tenantRoles,
      [tenantId]: updatedRoles
    };
    
    // Update tenant IDs if not already present
    const tenantIds = Array.isArray(currentClaims.tenantIds) 
      ? [...currentClaims.tenantIds]
      : [];
      
    if (!tenantIds.includes(tenantId)) {
      tenantIds.push(tenantId);
    }
    
    // Set selected tenant if none selected
    const selectedTenantId = currentClaims.selectedTenantId || tenantId;
    
    // Update custom claims
    const updatedClaims = {
      ...currentClaims,
      tenantIds,
      tenantRoles,
      selectedTenantId,
      // Store role assignment metadata
      roleAssignments: {
        ...currentClaims.roleAssignments,
        [tenantId]: {
          roles: updatedRoles,
          assignedBy,
          assignedAt: new Date().toISOString()
        }
      }
    };
    
    await adminAuth.setCustomUserClaims(userId, updatedClaims);
    
    console.log(`✅ Assigned role ${role} to user ${userId} in tenant ${tenantId}. Total roles: ${updatedRoles.length}`);
  } catch (error) {
    console.error("Failed to assign user role:", error);
    throw new Error(`Failed to assign role: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Remove a user from a tenant (remove their role)
 */
export async function removeUserFromTenant(
  userId: string,
  tenantId: string
): Promise<void> {
  try {
    const adminAuth = getFirebaseAdminAuth();
    
    // Get current user claims
    const userRecord = await adminAuth.getUser(userId);
    const currentClaims = userRecord.customClaims || {};
    
    // Remove from tenant arrays
    const tenantIds = (currentClaims.tenantIds || []).filter((id: string) => id !== tenantId);
    const tenantRoles = { ...currentClaims.tenantRoles };
    delete tenantRoles[tenantId];
    
    const roleAssignments = { ...currentClaims.roleAssignments };
    delete roleAssignments[tenantId];
    
    // Update selected tenant if it was the removed one
    let selectedTenantId = currentClaims.selectedTenantId;
    if (selectedTenantId === tenantId) {
      selectedTenantId = tenantIds.length > 0 ? tenantIds[0] : null;
    }
    
    // Update custom claims
    const updatedClaims = {
      ...currentClaims,
      tenantIds,
      tenantRoles,
      selectedTenantId,
      roleAssignments
    };
    
    await adminAuth.setCustomUserClaims(userId, updatedClaims);
    
    console.log(`✅ Removed user ${userId} from tenant ${tenantId}`);
  } catch (error) {
    console.error("Failed to remove user from tenant:", error);
    throw new Error(`Failed to remove user from tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user's role in a specific tenant
 */
export async function getUserRoleInTenant(
  userId: string,
  tenantId: string
): Promise<UserRole | null> {
  try {
    const adminAuth = getFirebaseAdminAuth();
    const userRecord = await adminAuth.getUser(userId);
    const claims = userRecord.customClaims || {};
    
    return claims.tenantRoles?.[tenantId] || null;
  } catch (error) {
    console.error("Failed to get user role:", error);
    return null;
  }
}

/**
 * Set user as super admin (global role)
 */
export async function makeUserSuperAdmin(userId: string): Promise<void> {
  try {
    const adminAuth = getFirebaseAdminAuth();
    
    // Get current user claims
    const userRecord = await adminAuth.getUser(userId);
    const currentClaims = userRecord.customClaims || {};
    
    // For super admin, we'll use a special tenant ID and also ensure they can access any tenant
    await assignUserRole(userId, "system", ROLES.SUPER_ADMIN, "system");
    
    // Also add a global super admin flag for easier permission checking
    const updatedClaims = {
      ...currentClaims,
      isSuperAdmin: true,
      canAccessAllTenants: true
    };
    
    await adminAuth.setCustomUserClaims(userId, updatedClaims);
    
    console.log(`✅ Made user ${userId} super admin with global access`);
  } catch (error) {
    console.error("Failed to make user super admin:", error);
    throw new Error(`Failed to make user super admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user is super admin
 */
export async function isUserSuperAdmin(userId: string): Promise<boolean> {
  const role = await getUserRoleInTenant(userId, "system");
  return role === ROLES.SUPER_ADMIN;
}
