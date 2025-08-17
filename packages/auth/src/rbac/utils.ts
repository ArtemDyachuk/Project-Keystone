/**
 * RBAC Utility Functions
 * Core RBAC logic and role-permission mapping
 */

import { ROLES, type UserRole, type RoleDefinition } from "./roles";
import { PERMISSIONS, type Permission } from "./permissions";

/**
 * Get role definition by role ID
 */
export function getRoleDefinition(roleId: UserRole): RoleDefinition {
  return ROLE_DEFINITIONS[roleId];
}

/**
 * Get all available roles (excluding system roles unless specified)
 */
export function getAvailableRoles(includeSystemRoles = false): RoleDefinition[] {
  return Object.values(ROLE_DEFINITIONS).filter(role => 
    includeSystemRoles || !role.isSystemRole
  );
}

/**
 * Get permissions for a specific role
 */
export function getRolePermissions(roleId: UserRole): string[] {
  return ROLE_DEFINITIONS[roleId]?.permissions || [];
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(roleId: UserRole, permission: Permission): boolean {
  const permissions = getRolePermissions(roleId);
  return permissions.includes("*") || permissions.includes(permission);
}

/**
 * Check if user has permission in a specific tenant
 */
export function hasPermission(
  userClaims: any, 
  tenantId: string, 
  permission: Permission
): boolean {
  // Super admins have all permissions
  if (userClaims?.isSuperAdmin) {
    return true;
  }
  
  const roles = userClaims?.tenantRoles?.[tenantId];
  if (!roles) return false;
  
  // Handle both single role (backward compatibility) and multiple roles
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  // Check if any of the user's roles have the required permission
  return roleArray.some(role => roleHasPermission(role, permission));
}

/**
 * Require permission (throws error if not present)
 */
export function requirePermission(
  userClaims: any, 
  tenantId: string, 
  permission: Permission
): void {
  if (!hasPermission(userClaims, tenantId, permission)) {
    throw new Error(`Insufficient permissions: ${permission} in tenant ${tenantId}`);
  }
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userClaims: any): boolean {
  // Check global super admin flag first
  if (userClaims?.isSuperAdmin) {
    return true;
  }
  
  // Check if any tenant has super admin role
  const tenantRoles = userClaims?.tenantRoles || {};
  return Object.values(tenantRoles).some(roles => {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(ROLES.SUPER_ADMIN);
  });
}

// Role definitions moved from roles.ts
export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  [ROLES.SUPER_ADMIN]: {
    id: ROLES.SUPER_ADMIN,
    name: "Super Admin",
    description: "This role has full system access across all tenants and can manage all users, tenants, and system settings.",
    permissions: ["*"],
    isSystemRole: true
  },
  [ROLES.TENANT_OWNER]: {
    id: ROLES.TENANT_OWNER,
    name: "Tenant Owner",
    description: "This role has full control over their tenant, including managing users, settings, and tenant configuration.",
    permissions: [
      PERMISSIONS.TENANT_READ,
      PERMISSIONS.TENANT_WRITE, 
      PERMISSIONS.TENANT_DELETE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.USERS_WRITE, 
      PERMISSIONS.USERS_DELETE,
      PERMISSIONS.USERS_ROLES,
      PERMISSIONS.SETTINGS_READ,
      PERMISSIONS.SETTINGS_WRITE
    ]
  },
  [ROLES.TENANT_ADMIN]: {
    id: ROLES.TENANT_ADMIN,
    name: "Tenant Admin", 
    description: "This role can manage users within the tenant and access most tenant features, but cannot modify tenant settings.",
    permissions: [
      PERMISSIONS.TENANT_READ,
      PERMISSIONS.USERS_READ, 
      PERMISSIONS.USERS_WRITE,
      PERMISSIONS.USERS_ROLES,
      PERMISSIONS.SETTINGS_READ
    ]
  },
  [ROLES.TENANT_USER]: {
    id: ROLES.TENANT_USER,
    name: "Tenant User",
    description: "This role provides standard access to tenant features and can view other users but cannot modify them.",
    permissions: [
      PERMISSIONS.TENANT_READ,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.SETTINGS_READ
    ]
  },
  [ROLES.TENANT_VIEWER]: {
    id: ROLES.TENANT_VIEWER,
    name: "Tenant Viewer", 
    description: "This role provides read-only access to basic tenant information and limited user visibility.",
    permissions: [
      PERMISSIONS.TENANT_READ
    ]
  }
};
