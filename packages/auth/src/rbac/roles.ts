/**
 * Role Definitions
 * Defines role constants and types for the RBAC system
 */

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  TENANT_OWNER: "tenant_owner", 
  TENANT_ADMIN: "tenant_admin",
  TENANT_USER: "tenant_user",
  TENANT_VIEWER: "tenant_viewer"
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export interface RoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  permissions: string[];
  isSystemRole?: boolean; // Can't be assigned manually
}
