import { roleHasPermission, getAllPermissionsForRole, getAllResourcePermissions } from "@keystone/rbac";
import type { CurrentUser } from "@/lib/sessions/utils";

export class RBACService {
  /**
   * Check if user is a Global Admin (super admin with access to everything)
   */
  private static isGlobalAdmin(user: CurrentUser): boolean {
    return user.roles.includes("Global:Admin");
  }

  /**
   * Check if user has a specific permission
   * Global:Admin automatically has all permissions
   */
  static hasPermission(user: CurrentUser, permission: string): boolean {
    // Global:Admin has access to everything
    if (this.isGlobalAdmin(user)) {
      return true;
    }

    // Use standard @keystone/rbac function for role permissions
    return user.roles.some(role => roleHasPermission(role, permission));
  }

  /**
   * Check if user has any of the specified permissions
   * Global:Admin automatically has all permissions
   */
  static hasAnyPermission(user: CurrentUser, permissions: string[]): boolean {
    // Global:Admin has access to everything
    if (this.isGlobalAdmin(user)) {
      return true;
    }

    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has all of the specified permissions
   * Global:Admin automatically has all permissions
   */
  static hasAllPermissions(user: CurrentUser, permissions: string[]): boolean {
    // Global:Admin has access to everything
    if (this.isGlobalAdmin(user)) {
      return true;
    }

    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if user has a specific role
   * Global:Admin automatically has all roles
   */
  static hasRole(user: CurrentUser, role: string): boolean {
    // Global:Admin has access to everything
    if (this.isGlobalAdmin(user)) {
      return true;
    }

    return user.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   * Global:Admin automatically has all roles
   */
  static hasAnyRole(user: CurrentUser, roles: string[]): boolean {
    // Global:Admin has access to everything
    if (this.isGlobalAdmin(user)) {
      return true;
    }

    return roles.some(role => this.hasRole(user, role));
  }

  /**
   * Get all permissions for a user (from all their roles)
   * Global:Admin gets all available permissions
   */
  static getUserPermissions(user: CurrentUser): string[] {
    // Global:Admin has access to everything
    if (this.isGlobalAdmin(user)) {
      // Return all available permissions in the system
      return [
        ...getAllResourcePermissions(),
        "global:read", "global:admin"
      ];
    }

    const allPermissions = new Set<string>();

    // Add permissions from direct roles using @keystone/rbac
    user.roles.forEach(role => {
      const rolePermissions = getAllPermissionsForRole(role);
      rolePermissions.forEach((permission: string) => allPermissions.add(permission));
    });

    return Array.from(allPermissions);
  }
}