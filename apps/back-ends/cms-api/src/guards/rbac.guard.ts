import { Injectable, CanActivate, ExecutionContext, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TenantMembership } from '@keystone/database';
import { roleHasPermission } from '@keystone/rbac';

@Injectable()
export class RbacGuard implements CanActivate {
   private readonly logger = new Logger(RbacGuard.name);

   constructor(private reflector: Reflector) { }

   async canActivate(context: ExecutionContext): Promise<boolean> {
      try {
         // Get permission requirements from decorators
         const requiredPermission = this.reflector.get<string>('permission', context.getHandler());
         const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
         const anyPermissions = this.reflector.get<string[]>('anyPermissions', context.getHandler());

         // If no permissions are required, allow access
         if (!requiredPermission && !requiredPermissions && !anyPermissions) {
            return true;
         }

         const request = context.switchToHttp().getRequest<Request & { user?: { uid: string; selectedTenantId?: string }; tenantId?: string }>();

         // Check if user is authenticated
         if (!request.user?.uid) {
            this.logger.warn('❌ RBAC Guard: No authenticated user found');
            throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
         }

         const userId = request.user.uid;

         // Get tenant context (from request params, query, or user session)
         const tenantId = await this.extractTenantId(request);

         if (!tenantId) {
            this.logger.warn(`❌ RBAC Guard: No tenant context found for user ${userId}`);
            throw new HttpException('Tenant context required', HttpStatus.BAD_REQUEST);
         }

         // Get user's roles in this tenant
         const userRoles = await this.getUserRoles(userId, tenantId);

         if (userRoles.length === 0) {
            this.logger.warn(`❌ RBAC Guard: User ${userId} has no roles in tenant ${tenantId}`);
            throw new HttpException('Access denied - no roles in tenant', HttpStatus.FORBIDDEN);
         }

         // Check permissions based on decorator type
         let hasAccess = false;

         if (requiredPermission) {
            hasAccess = this.userHasPermission(userRoles, requiredPermission);
            this.logger.log(`🔍 RBAC Guard: Checking single permission '${requiredPermission}' for user ${userId}: ${hasAccess}`);
         }

         if (requiredPermissions && requiredPermissions.length > 0) {
            hasAccess = this.userHasAllPermissions(userRoles, requiredPermissions);
            this.logger.log(`🔍 RBAC Guard: Checking all permissions [${requiredPermissions.join(', ')}] for user ${userId}: ${hasAccess}`);
         }

         if (anyPermissions && anyPermissions.length > 0) {
            hasAccess = this.userHasAnyPermission(userRoles, anyPermissions);
            this.logger.log(`🔍 RBAC Guard: Checking any permissions [${anyPermissions.join(', ')}] for user ${userId}: ${hasAccess}`);
         }

         if (!hasAccess) {
            this.logger.warn(`❌ RBAC Guard: Access denied for user ${userId} - insufficient permissions`);
            throw new HttpException('Insufficient permissions', HttpStatus.FORBIDDEN);
         }

         this.logger.log(`✅ RBAC Guard: Access granted for user ${userId}`);
         return true;

      } catch (error) {
         if (error instanceof HttpException) {
            throw error;
         }

         this.logger.error('❌ RBAC Guard: Unexpected error:', error);
         throw new HttpException('Authorization check failed', HttpStatus.INTERNAL_SERVER_ERROR);
      }
   }

   /**
    * Extract tenant ID from request context
    */
   private async extractTenantId(request: Request & { user?: { uid: string; selectedTenantId?: string }; tenantId?: string }): Promise<string | null> {
      // Priority order for tenant ID:
      // 1. Request params (e.g., /tenants/:tenantId)
      // 2. Request query (e.g., ?tenantId=...)
      // 3. User's selected tenant from session
      // 4. Request body
      // 5. User's active tenant membership (fallback for corporation endpoints)

      const params = request.params as Record<string, string>;
      const query = request.query as Record<string, string>;
      const body = request.body as Record<string, unknown>;

      let tenantId = params?.tenantId ||
         query?.tenantId ||
         request.tenantId ||
         request.user?.selectedTenantId ||
         (body?.tenantId as string);

      // If no tenant ID found and we have a user, try to get from their active membership
      if (!tenantId && request.user?.uid) {
         try {
            const membership = await TenantMembership.findOne({
               userId: request.user.uid,
               isActive: true
            });
            tenantId = membership?.tenantId?.toString() || null;
         } catch (error) {
            this.logger.warn(`Failed to get tenant from user membership: ${error}`);
         }
      }

      return tenantId;
   }

   /**
    * Get user's roles in a specific tenant
    */
   private async getUserRoles(userId: string, tenantId: string): Promise<string[]> {
      try {
         const membership = await TenantMembership.findOne({
            userId: userId,
            tenantId: tenantId,
            isActive: true
         });

         return membership?.roles || [];
      } catch (error) {
         this.logger.error(`❌ Failed to get user roles for user ${userId} in tenant ${tenantId}:`, error);
         return [];
      }
   }

   /**
    * Check if user has a specific permission
    */
   private userHasPermission(userRoles: string[], permission: string): boolean {
      return userRoles.some(role => {
         // Check for global admin permission first (overrides everything)
         if (roleHasPermission(role, "global:admin")) {
            this.logger.debug(`✅ Role '${role}' has global admin permission - access granted`);
            return true;
         }

         // Check for global read permission (overrides read operations)
         if (permission.includes(":read") && roleHasPermission(role, "global:read")) {
            this.logger.debug(`✅ Role '${role}' has global read permission - access granted`);
            return true;
         }

         // Check specific permission
         const hasPermission = roleHasPermission(role, permission);
         if (hasPermission) {
            this.logger.debug(`✅ Role '${role}' has permission '${permission}'`);
         }
         return hasPermission;
      });
   }

   /**
    * Check if user has ALL required permissions
    */
   private userHasAllPermissions(userRoles: string[], permissions: string[]): boolean {
      return permissions.every(permission => this.userHasPermission(userRoles, permission));
   }

   /**
    * Check if user has ANY of the required permissions
    */
   private userHasAnyPermission(userRoles: string[], permissions: string[]): boolean {
      return permissions.some(permission => this.userHasPermission(userRoles, permission));
   }


}
