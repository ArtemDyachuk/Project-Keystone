import { RoleDefinition, RoleConfig, RoleOption } from "./types";
import { ROLES_CONFIG } from "./roles.config";

// Helper function to get all role names
export function getAllRoleNames(): string[] {
   const roles: string[] = [];
   Object.values(ROLES_CONFIG).forEach(resourceRoles => {
      Object.values(resourceRoles).forEach(role => {
         roles.push(role.name);
      });
   });
   return roles;
}

// Helper function to get role definition by name
export function getRoleDefinition(roleName: string): RoleDefinition | undefined {
   for (const resourceRoles of Object.values(ROLES_CONFIG)) {
      for (const role of Object.values(resourceRoles)) {
         if (role.name === roleName) {
            return role;
         }
      }
   }
   return undefined;
}

// Helper function to check if a role has a specific permission
export function roleHasPermission(roleName: string, permission: string): boolean {
   const role = getRoleDefinition(roleName);
   if (!role) return false;

   // Check direct permissions
   if (role.permissions.includes(permission)) {
      return true;
   }

   // Check inherited permissions
   if (role.inheritsFrom) {
      return role.inheritsFrom.some(inheritedRole =>
         roleHasPermission(inheritedRole, permission)
      );
   }

   return false;
}

// Helper function to get all permissions for a role (including inherited)
export function getAllPermissionsForRole(roleName: string): string[] {
   const role = getRoleDefinition(roleName);
   if (!role) return [];

   const permissions = new Set(role.permissions);

   // Add inherited permissions
   if (role.inheritsFrom) {
      role.inheritsFrom.forEach(inheritedRole => {
         const inheritedPermissions = getAllPermissionsForRole(inheritedRole);
         inheritedPermissions.forEach(permission => permissions.add(permission));
      });
   }

   return Array.from(permissions);
}

// Helper function to get all available roles grouped by category
export function getRolesByCategory(): Record<string, RoleOption[]> {
   const rolesByCategory: Record<string, RoleOption[]> = {};

   Object.entries(ROLES_CONFIG).forEach(([category, roles]) => {
      rolesByCategory[category] = Object.values(roles).map(role => ({
         value: role.name,
         label: role.displayName,
         category,
         description: role.description,
      }));
   });

   return rolesByCategory;
}

// Export the complete configuration
export const ROLE_CONFIG: RoleConfig = {
   resources: ROLES_CONFIG,
   allRoles: getAllRoleNames(),
   roleHierarchy: new Map(
      getAllRoleNames().map(roleName => {
         const role = getRoleDefinition(roleName);
         return [roleName, role?.inheritsFrom || []];
      })
   ),
};
