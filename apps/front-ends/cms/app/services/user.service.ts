import type { CurrentUser } from "@/lib/sessions/utils";
import { RBACService } from "./rbac.service";
import { PERMISSIONS } from "@keystone/rbac";

export interface UserService {
  hasRole(user: CurrentUser, role: string): boolean;
  hasAnyRole(user: CurrentUser, roles: string[]): boolean;
  canAccessUsers(user: CurrentUser): boolean;
  canAccessTenants(user: CurrentUser): boolean;
  canAccessCorporations(user: CurrentUser): boolean;
  canAccessSettings(user: CurrentUser): boolean;
  
  // Enhanced permission-based methods
  canCreateUsers(user: CurrentUser): boolean;
  canInviteUsers(user: CurrentUser): boolean;
  canEditUsers(user: CurrentUser): boolean;
  canDeleteUsers(user: CurrentUser): boolean;
  canManageUserRoles(user: CurrentUser): boolean;
}

export class UserServiceClient implements UserService {
  /**
   * Check if user has a specific role
   */
  hasRole(user: CurrentUser, role: string): boolean {
    return RBACService.hasRole(user, role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: CurrentUser, roles: string[]): boolean {
    return RBACService.hasAnyRole(user, roles);
  }

  /**
   * Check if user can access Users section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin, User:Admin
   */
  canAccessUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_READ);
  }

  /**
   * Check if user can access Tenants section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin
   */
  canAccessTenants(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.TENANT_READ);
  }

  /**
   * Check if user can access Corporations section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin
   */
  canAccessCorporations(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.TENANT_READ); // Using tenant read for now
  }

  /**
   * Check if user can access Settings section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin
   */
  canAccessSettings(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.TENANT_UPDATE);
  }

  // Enhanced permission-based methods
  
  /**
   * Check if user can create new users
   */
  canCreateUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_CREATE);
  }

  /**
   * Check if user can invite new users
   */
  canInviteUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_INVITE);
  }

  /**
   * Check if user can edit existing users
   */
  canEditUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_UPDATE);
  }

  /**
   * Check if user can delete users
   */
  canDeleteUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_DELETE);
  }

  /**
   * Check if user can manage user roles
   */
  canManageUserRoles(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_MANAGE);
  }

  // Static methods for convenience
  static hasRole(user: CurrentUser, role: string): boolean {
    return RBACService.hasRole(user, role);
  }

  static hasAnyRole(user: CurrentUser, roles: string[]): boolean {
    return RBACService.hasAnyRole(user, roles);
  }

  static canAccessUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_READ);
  }

  static canAccessTenants(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.TENANT_READ);
  }

  static canAccessCorporations(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.TENANT_READ);
  }

  static canAccessSettings(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.TENANT_UPDATE);
  }

  // Enhanced static methods
  static canCreateUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_CREATE);
  }

  static canInviteUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_INVITE);
  }

  static canEditUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_UPDATE);
  }

  static canDeleteUsers(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_DELETE);
  }

  static canManageUserRoles(user: CurrentUser): boolean {
    return RBACService.hasPermission(user, PERMISSIONS.USER_MANAGE);
  }
}
