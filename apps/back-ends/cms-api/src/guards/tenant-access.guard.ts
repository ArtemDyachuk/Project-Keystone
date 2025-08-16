import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { CognitoAdminService } from '../services/cognito-admin.service';
import { decodeJwtToken, verifyJwtToken } from '@keystone/auth-aws';

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
      // Verify and decode JWT to get user info
      const token = authHeader.replace('Bearer ', '');
      
      // SECURITY: Always verify JWT signatures in production
      let decoded;
      if (process.env.NODE_ENV === 'production') {
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        const region = process.env.AWS_REGION || 'us-east-1';
        if (userPoolId) {
          // Use verified JWT in production
          decoded = await verifyJwtToken(token, userPoolId, region, 'access');
        } else {
          throw new UnauthorizedException('Authentication service not properly configured');
        }
      } else {
        // For development, decode without verification (but log warning)
        decoded = decodeJwtToken(token);
        console.warn('⚠️ JWT signature verification disabled in development mode');
      }
      const username = decoded.username || decoded.email || decoded.sub;

      if (!username) {
        throw new UnauthorizedException('Invalid token: username not found');
      }

      // Get user's tenant info from Cognito
      const userPoolId = process.env.COGNITO_USER_POOL_ID;
      if (!userPoolId) {
        console.error('COGNITO_USER_POOL_ID not set - SECURITY: Denying access');
        throw new UnauthorizedException('Authentication service not properly configured');
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
