import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { SessionData } from "../lib/session/session.store";

// Extend the Request interface locally to include tenant context
interface TenantAwareRequest extends Request {
  user?: DecodedIdToken;
  sessionCtx?: SessionData;
  tenantId?: string;
  tenantRoles?: string[]; // Changed from single role to array
}

@Injectable()
export class TenantGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<TenantAwareRequest>();

    // Ensure user is authenticated (should be handled by FirebaseSessionGuard first)
    if (!req.user) {
      throw new UnauthorizedException("Authentication required");
    }

    // Ensure session context exists (should be handled by SessionGuard)
    if (!req.sessionCtx) {
      throw new UnauthorizedException("Session required");
    }

    // Check if user has selected a tenant
    if (!req.sessionCtx.tenantId) {
      throw new ForbiddenException(
        "No tenant selected. Please select a tenant to access this resource."
      );
    }

    // Attach tenant context to request for use in controllers
    req.tenantId = req.sessionCtx.tenantId;
    req.tenantRoles = req.sessionCtx.roles || [];

    return true;
  }
}