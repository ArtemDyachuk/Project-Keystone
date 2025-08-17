/**
 * Permission Definitions and Utilities
 * Defines all available permissions and permission checking functions
 */

export const PERMISSIONS = {
  // Tenant permissions
  TENANT_READ: "tenant:read",
  TENANT_WRITE: "tenant:write", 
  TENANT_DELETE: "tenant:delete",
  
  // User permissions
  USERS_READ: "users:read",
  USERS_WRITE: "users:write",
  USERS_DELETE: "users:delete",
  USERS_ROLES: "users:roles", // Can change user roles
  
  // Settings permissions
  SETTINGS_READ: "settings:read",
  SETTINGS_WRITE: "settings:write"
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
