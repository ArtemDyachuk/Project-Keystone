/**
 * Helper functions for multi-role authorization
 */

/**
 * Check if user has any of the required roles
 */
export function hasRole(userRoles: string[] | undefined, required: string | string[]): boolean {
   if (!userRoles || userRoles.length === 0) {
      return false;
   }

   const requiredRoles = Array.isArray(required) ? required : [required];
   return requiredRoles.some(role => userRoles.includes(role));
}

/**
 * Check if user has all of the required roles
 */
export function hasAllRoles(userRoles: string[] | undefined, required: string[]): boolean {
   if (!userRoles || userRoles.length === 0) {
      return false;
   }

   return required.every(role => userRoles.includes(role));
}

/**
 * Get the highest priority role from user's roles
 * Priority: tenant_owner > tenant_admin > tenant_user
 */
export function getHighestRole(userRoles: string[] | undefined): string | null {
   if (!userRoles || userRoles.length === 0) {
      return null;
   }

   const rolePriority = {
      'tenant_owner': 3,
      'tenant_admin': 2,
      'tenant_user': 1,
   };

   let highestRole = null;
   let highestPriority = 0;

   for (const role of userRoles) {
      const priority = rolePriority[role as keyof typeof rolePriority] || 0;
      if (priority > highestPriority) {
         highestPriority = priority;
         highestRole = role;
      }
   }

   return highestRole;
}
