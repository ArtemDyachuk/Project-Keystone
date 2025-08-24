import { ResourceRoles } from "./types";

// Define all available permissions
export const PERMISSIONS = {
   // Tenant permissions
   TENANT_CREATE: "tenant:create",
   TENANT_READ: "tenant:read",
   TENANT_UPDATE: "tenant:update",
   TENANT_DELETE: "tenant:delete",
   TENANT_MANAGE_USERS: "tenant:manage_users",
   TENANT_MANAGE_SETTINGS: "tenant:manage_settings",

   // Corporation permissions
   CORPORATION_CREATE: "corporation:create",
   CORPORATION_READ: "corporation:read",
   CORPORATION_UPDATE: "corporation:update",
   CORPORATION_DELETE: "corporation:delete",
   CORPORATION_MANAGE_USERS: "corporation:manage_users",
   CORPORATION_MANAGE_SETTINGS: "corporation:manage_settings",

   // User permissions
   USER_CREATE: "user:create",
   USER_READ: "user:read",
   USER_UPDATE: "user:update",
   USER_DELETE: "user:delete",
   USER_MANAGE_ROLES: "user:manage_roles",

   // System permissions
   SYSTEM_READ: "system:read",
   SYSTEM_MANAGE: "system:manage",

   // Global permissions (override all resource-specific permissions)
   GLOBAL_READ: "global:read",
   GLOBAL_ADMIN: "global:admin",
} as const;

// Define the role configuration
export const ROLES_CONFIG: ResourceRoles = {
   Tenant: {
      Owner: {
         name: "Tenant:Owner",
         displayName: "Tenant Owner",
         description: "Full control over tenant, including deletion and user management",
         permissions: [
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.TENANT_UPDATE,
            PERMISSIONS.TENANT_DELETE,
            PERMISSIONS.TENANT_MANAGE_USERS,
            PERMISSIONS.TENANT_MANAGE_SETTINGS,
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.USER_READ,
         ],
      },
      Admin: {
         name: "Tenant:Admin",
         displayName: "Tenant Administrator",
         description: "Manage tenant settings and users, but cannot delete tenant",
         permissions: [
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.TENANT_UPDATE,
            PERMISSIONS.TENANT_MANAGE_USERS,
            PERMISSIONS.TENANT_MANAGE_SETTINGS,
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.USER_READ,
         ],
         inheritsFrom: ["Tenant:Reader"],
      },
      Reader: {
         name: "Tenant:Reader",
         displayName: "Tenant Reader",
         description: "View-only access to tenant resources",
         permissions: [
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.USER_READ,
         ],
      },
   },

   Corporation: {
      Owner: {
         name: "Corporation:Owner",
         displayName: "Corporation Owner",
         description: "Full control over corporation, including deletion",
         permissions: [
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.CORPORATION_UPDATE,
            PERMISSIONS.CORPORATION_DELETE,
            PERMISSIONS.CORPORATION_MANAGE_USERS,
            PERMISSIONS.CORPORATION_MANAGE_SETTINGS,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.USER_READ,
         ],
      },
      Admin: {
         name: "Corporation:Admin",
         displayName: "Corporation Administrator",
         description: "Manage corporation settings and users, but cannot delete",
         permissions: [
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.CORPORATION_UPDATE,
            PERMISSIONS.CORPORATION_MANAGE_USERS,
            PERMISSIONS.CORPORATION_MANAGE_SETTINGS,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.USER_READ,
         ],
         inheritsFrom: ["Corporation:Reader"],
      },
      Reader: {
         name: "Corporation:Reader",
         displayName: "Corporation Reader",
         description: "View-only access to corporation resources",
         permissions: [
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.USER_READ,
         ],
      },
   },

   User: {
      Admin: {
         name: "User:Admin",
         displayName: "User Administrator",
         description: "System-wide user management capabilities",
         permissions: [
            PERMISSIONS.USER_CREATE,
            PERMISSIONS.USER_READ,
            PERMISSIONS.USER_UPDATE,
            PERMISSIONS.USER_DELETE,
            PERMISSIONS.USER_MANAGE_ROLES,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.SYSTEM_READ,
         ],
      },
      Reader: {
         name: "User:Reader",
         displayName: "User Reader",
         description: "View-only access to user data",
         permissions: [
            PERMISSIONS.USER_READ,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.CORPORATION_READ,
         ],
      },
   },

   Global: {
      Admin: {
         name: "Global:Admin",
         displayName: "Global Administrator",
         description: "Full system access - can perform any action on any resource",
         permissions: [
            PERMISSIONS.GLOBAL_ADMIN,
            PERMISSIONS.GLOBAL_READ,
            // Include all specific permissions for clarity
            PERMISSIONS.TENANT_CREATE,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.TENANT_UPDATE,
            PERMISSIONS.TENANT_DELETE,
            PERMISSIONS.TENANT_MANAGE_USERS,
            PERMISSIONS.TENANT_MANAGE_SETTINGS,
            PERMISSIONS.CORPORATION_CREATE,
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.CORPORATION_UPDATE,
            PERMISSIONS.CORPORATION_DELETE,
            PERMISSIONS.CORPORATION_MANAGE_USERS,
            PERMISSIONS.CORPORATION_MANAGE_SETTINGS,
            PERMISSIONS.USER_CREATE,
            PERMISSIONS.USER_READ,
            PERMISSIONS.USER_UPDATE,
            PERMISSIONS.USER_DELETE,
            PERMISSIONS.USER_MANAGE_ROLES,
            PERMISSIONS.SYSTEM_READ,
            PERMISSIONS.SYSTEM_MANAGE,
         ],
      },
      Reader: {
         name: "Global:Reader",
         displayName: "Global Reader",
         description: "Read access to all system resources across all tenants",
         permissions: [
            PERMISSIONS.GLOBAL_READ,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.USER_READ,
            PERMISSIONS.SYSTEM_READ,
         ],
      },
   },
};
