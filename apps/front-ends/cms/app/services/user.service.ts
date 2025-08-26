import type { CurrentUser } from "@/lib/sessions/utils";

export interface UserService {
  hasRole(user: CurrentUser, role: string): boolean;
  hasAnyRole(user: CurrentUser, roles: string[]): boolean;
  canAccessUsers(user: CurrentUser): boolean;
  canAccessTenants(user: CurrentUser): boolean;
  canAccessCorporations(user: CurrentUser): boolean;
  canAccessSettings(user: CurrentUser): boolean;
}

export class UserServiceClient implements UserService {
  /**
   * Check if user has a specific role
   */
  hasRole(user: CurrentUser, role: string): boolean {
    return user.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(user: CurrentUser, roles: string[]): boolean {
    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Check if user can access Users section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin, User:Admin
   */
  canAccessUsers(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner", 
      "Tenant:Admin",
      "User:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }

  /**
   * Check if user can access Tenants section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin
   */
  canAccessTenants(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner",
      "Tenant:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }

  /**
   * Check if user can access Corporations section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin
   */
  canAccessCorporations(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner",
      "Tenant:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }

  /**
   * Check if user can access Settings section
   * Accessible by: Global:Admin, Tenant:Owner, Tenant:Admin
   */
  canAccessSettings(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner",
      "Tenant:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }

  // Static methods for convenience
  static hasRole(user: CurrentUser, role: string): boolean {
    return user.roles.includes(role);
  }

  static hasAnyRole(user: CurrentUser, roles: string[]): boolean {
    return roles.some(role => user.roles.includes(role));
  }

  static canAccessUsers(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner", 
      "Tenant:Admin",
      "User:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }

  static canAccessTenants(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner",
      "Tenant:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }

  static canAccessCorporations(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner",
      "Tenant:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }

  static canAccessSettings(user: CurrentUser): boolean {
    const allowedRoles = [
      "Global:Admin",
      "Tenant:Owner",
      "Tenant:Admin"
    ];
    return this.hasAnyRole(user, allowedRoles);
  }
}
