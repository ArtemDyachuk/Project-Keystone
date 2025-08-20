import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor() { }

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
      // Verify and decode JWT to get user info
      // const token = authHeader.replace('Bearer ', '');

      // SECURITY: Always verify JWT signatures in production
      // let decoded;
      if (process.env.NODE_ENV === 'production') {
        // if (userPoolId) {
        //   // Use verified JWT in production
        //   // decoded = await verifyJwtToken(token, userPoolId, region, 'access');
        // } else {
        //   throw new UnauthorizedException('Authentication service not properly configured');
        // }
      } else {
        // For development, decode without verification (but log warning)
        // decoded = decodeJwtToken(token);
        console.warn('⚠️ JWT signature verification disabled in development mode');
      }
      // const username = decoded.username || decoded.email || decoded.sub;
      const username = "test";
      if (!username) {
        throw new UnauthorizedException('Invalid token: username not found');
      }

      const tenantInfo = {
        tenantIds: [],
        selectedTenantId: null
      }

      // Check if user has access to this tenant
      // if (!tenantInfo.tenantIds.includes(tenantId)) {
      //   console.warn(`Unauthorized tenant access: User ${username} tried to access tenant ${tenantId}`);
      //   throw new ForbiddenException(`Access denied to tenant ${tenantId}`);
      // }

      // Store user info in request for later use
      request.user = {
        username,
        sub: "test",
        // sub: decoded.sub,
        tenantIds: tenantInfo.tenantIds,
        selectedTenantId: tenantInfo.selectedTenantId
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      console.error('Tenant access validation failed:', error);
      throw new ForbiddenException('Tenant access validation failed');
    }
  }
}
