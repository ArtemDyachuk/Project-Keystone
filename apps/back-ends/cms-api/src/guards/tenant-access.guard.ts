import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { CognitoAdminService } from '../services/cognito-admin.service';
import { decodeJwtToken } from '@keystone/auth';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(private readonly cognitoAdminService: CognitoAdminService) {}

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
      // Decode JWT to get user info
      const token = authHeader.replace('Bearer ', '');
      const decoded = decodeJwtToken(token);
      const username = decoded.username || decoded.email || decoded.sub;

      if (!username) {
        throw new UnauthorizedException('Invalid token: username not found');
      }

      // Get user's tenant info from Cognito
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      if (!userPoolId) {
        console.warn('COGNITO_USER_POOL_ID not set, skipping tenant validation');
        return true; // Allow access if Cognito not configured
      }

      const tenantInfo = await this.cognitoAdminService.getUserTenantInfo(
        userPoolId,
        username
      );

      // Check if user has access to this tenant
      if (!tenantInfo.tenantIds.includes(tenantId)) {
        console.warn(`Unauthorized tenant access: User ${username} tried to access tenant ${tenantId}`);
        throw new ForbiddenException(`Access denied to tenant ${tenantId}`);
      }

      // Store user info in request for later use
      request.user = {
        username,
        sub: decoded.sub,
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
