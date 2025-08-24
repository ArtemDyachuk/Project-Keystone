import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to require a specific permission for accessing an endpoint
 * Used in conjunction with RbacGuard to enforce role-based access control
 * 
 * @param permission - The permission required (e.g., 'CORPORATION_DELETE')
 * 
 * @example
 * ```typescript
 * @Delete(':id')
 * @UseGuards(SessionGuard, RbacGuard)
 * @RequirePermission('CORPORATION_DELETE')
 * async deleteCorporation(@Param('id') id: string) {
 *   // This method will only execute if user has CORPORATION_DELETE permission
 * }
 * ```
 */
export const RequirePermission = (permission: string) => SetMetadata('permission', permission);

/**
 * Decorator to require multiple permissions (user must have ALL listed permissions)
 * 
 * @param permissions - Array of permissions required
 * 
 * @example
 * ```typescript
 * @Post()
 * @UseGuards(SessionGuard, RbacGuard)
 * @RequirePermissions(['CORPORATION_CREATE', 'TENANT_MANAGE'])
 * async createSpecialCorporation() {
 *   // This method will only execute if user has both permissions
 * }
 * ```
 */
export const RequirePermissions = (permissions: string[]) => SetMetadata('permissions', permissions);

/**
 * Decorator to require ANY of the listed permissions (user must have at least ONE)
 * 
 * @param permissions - Array of permissions (user needs at least one)
 * 
 * @example
 * ```typescript
 * @Get(':id')
 * @UseGuards(SessionGuard, RbacGuard)
 * @RequireAnyPermission(['CORPORATION_READ', 'CORPORATION_ADMIN'])
 * async getCorporation(@Param('id') id: string) {
 *   // This method will execute if user has either permission
 * }
 * ```
 */
export const RequireAnyPermission = (permissions: string[]) => SetMetadata('anyPermissions', permissions);
