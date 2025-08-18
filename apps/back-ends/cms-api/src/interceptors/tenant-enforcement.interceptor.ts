import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export const SKIP_TENANT_ENFORCEMENT_KEY = 'skipTenantEnforcement';
export const SkipTenantEnforcement = () => SetMetadata(SKIP_TENANT_ENFORCEMENT_KEY, true);

@Injectable()
export class TenantEnforcementInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if tenant enforcement should be skipped for this route
    const skipEnforcement = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_ENFORCEMENT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (skipEnforcement) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const method = request.method.toLowerCase();

    // Only enforce on state-changing methods
    if (!['post', 'put', 'patch'].includes(method)) {
      return next.handle();
    }

    const sessionTenantId = request.tenantId; // Set by TenantGuard
    const bodyTenantId = request.body?.tenantId;

    // Only enforce conflicts when a session tenant is present
    if (
      sessionTenantId &&
      bodyTenantId &&
      bodyTenantId !== sessionTenantId
    ) {
      throw new BadRequestException(
        `Body tenantId (${bodyTenantId}) conflicts with session tenant (${sessionTenantId})`
      );
    }

    // For create/update operations, when a session tenant exists, ensure tenantId is set accordingly
    if (request.body && typeof request.body === 'object' && sessionTenantId) {
      // Clone the body to avoid mutating the original
      request.body = {
        ...request.body,
        tenantId: sessionTenantId,
      };
    }

    return next.handle().pipe(
      map((data) => {
        // Optionally sanitize response data to ensure no cross-tenant leakage
        if (data && typeof data === 'object' && data.tenantId) {
          // Verify response tenantId matches session tenant
          if (data.tenantId !== sessionTenantId) {
            console.warn(
              `Response tenantId (${data.tenantId}) doesn't match session tenant (${sessionTenantId})`
            );
          }
        }
        return data;
      })
    );
  }
}
