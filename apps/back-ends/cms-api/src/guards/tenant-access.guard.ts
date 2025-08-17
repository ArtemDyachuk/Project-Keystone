import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { decodeJwtToken, createTenantManagementService } from '@keystone/auth';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { params, headers } = request;
    
    // Extract tenant ID from route parameters
    const tenantId = params.id || params.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant ID is required');
    }

    // Extract JWT token from authorization header
    const authHeader = headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header required');
    }

    try {
      // Decode JWT to get user info (Firebase validates signature)
      const token = authHeader.replace('Bearer ', '');
      const decoded = decodeJwtToken(token);
      
      if (!decoded || !decoded.sub) {
        throw new UnauthorizedException('Invalid token: user ID not found');
      }

      // Get user's tenant info from Firebase custom claims
      try {
        const tenantService = createTenantManagementService();
        const userTenants = await tenantService.getUserTenants(decoded.sub);

        // Extract tenant IDs from Firebase response
        const userTenantIds = userTenants.map((userTenant: any) => userTenant.tenant.id);

        // Check if user has access to this tenant
        if (!userTenantIds.includes(tenantId)) {
          console.warn(`Unauthorized tenant access: User ${decoded.sub} tried to access tenant ${tenantId}`);
          throw new ForbiddenException(`Access denied to tenant ${tenantId}`);
        }

        // Store user info in request for later use
        request.user = {
          username: decoded.username || decoded.email || decoded.sub,
          sub: decoded.sub,
          tenantIds: userTenantIds,
          selectedTenantId: userTenantIds.length > 0 ? userTenantIds[0] : null
        };

        return true;
      } catch (firebaseError) {
        console.error('Firebase tenant access check failed:', firebaseError);
        throw new ForbiddenException('Unable to verify tenant access');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      
      console.error('Tenant access validation failed:', error);
      throw new ForbiddenException('Tenant access validation failed');
    }
  }
}
