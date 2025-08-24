import { ResourceRoles } from "./types";

// Define only essential permissions - no granular overcomplication
export const PERMISSIONS = {
   // Tenant permissions
   TENANT_CREATE: "tenant:create",
   TENANT_READ: "tenant:read",
   TENANT_UPDATE: "tenant:update",
   TENANT_DELETE: "tenant:delete",

   // Corporation permissions
   CORPORATION_CREATE: "corporation:create",
   CORPORATION_READ: "corporation:read",
   CORPORATION_UPDATE: "corporation:update",
   CORPORATION_DELETE: "corporation:delete",

   // User permissions
   USER_CREATE: "user:create",
   USER_READ: "user:read",
   USER_UPDATE: "user:update",
   USER_DELETE: "user:delete",
   USER_INVITE: "user:invite",

   // Global permissions (override all resource-specific permissions)
   GLOBAL_READ: "global:read",
   GLOBAL_ADMIN: "global:admin",
} as const;

// Define the role configuration with simplified permissions
export const ROLES_CONFIG: ResourceRoles = {
   Tenant: {
      Owner: {
         name: "Tenant:Owner",
         displayName: "Tenant Owner",
         description: "Full control over tenant, including deletion",
         permissions: [
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.TENANT_UPDATE,
            PERMISSIONS.TENANT_DELETE,
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
            PERMISSIONS.CORPORATION_READ,
            PERMISSIONS.USER_READ,
         ],
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
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.USER_READ,
         ],
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
         description: "Can create/invite users and manage user roles",
         permissions: [
            PERMISSIONS.USER_CREATE,
            PERMISSIONS.USER_INVITE,
            PERMISSIONS.USER_READ,
            PERMISSIONS.USER_UPDATE,
            PERMISSIONS.USER_DELETE,
            PERMISSIONS.TENANT_READ,
            PERMISSIONS.CORPORATION_READ,
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
            PERMISSIONS.TENANT_CREATE, PERMISSIONS.TENANT_READ, PERMISSIONS.TENANT_UPDATE, PERMISSIONS.TENANT_DELETE,
            PERMISSIONS.CORPORATION_CREATE, PERMISSIONS.CORPORATION_READ, PERMISSIONS.CORPORATION_UPDATE, PERMISSIONS.CORPORATION_DELETE,
            PERMISSIONS.USER_CREATE, PERMISSIONS.USER_INVITE, PERMISSIONS.USER_READ, PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_DELETE,
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
         ],
      },
   },
};
