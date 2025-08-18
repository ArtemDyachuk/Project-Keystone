import { Response } from "express";
import { TenantService } from "@keystone/database";
import { ROLES } from "@keystone/auth";
import { sessionStore, CreateSessionOptions } from "./session.store";
import { getSessionConfig } from "./session.config";

/**
 * Create a session for a user after successful authentication
 * This should be called after Firebase token verification
 */
export async function createUserSession(
  uid: string, 
  res: Response,
  options: {
    deviceId?: string;
    mfaStrongUntil?: number;
    firebaseTenantId?: string;
    firebaseUid?: string;
    tenantId?: string; // Override tenant ID
    roles?: string[]; // Override roles
  } = {}
): Promise<{ sid: string; defaultTenantId?: string }> {
  
  let defaultTenantId: string | undefined;
  let defaultRoles: string[] | undefined;

  // If tenant and roles are provided as overrides, use them
  if (options.tenantId && options.roles) {
    defaultTenantId = options.tenantId;
    defaultRoles = options.roles;
  } else {
    // Get user's tenants to determine default tenant
    const userTenants = await TenantService.getUserTenants(uid);
    
    if (userTenants.length === 1) {
      // User has exactly one tenant - set it as default
      defaultTenantId = userTenants[0].tenant._id!;
      defaultRoles = userTenants[0].membership.roles || [];
    } else if (userTenants.length === 0) {
      // User has no tenants - they'll need to create or be invited to one
      defaultTenantId = undefined;
      defaultRoles = undefined;
    } else {
      // User has multiple tenants - leave unset to force selection
      defaultTenantId = undefined;
      defaultRoles = undefined;
    }
  }

  const sessionOptions: CreateSessionOptions = {
    uid,
    tenantId: defaultTenantId,
    roles: defaultRoles as any, // Type assertion for UserRole[] compatibility
    mfaStrongUntil: options.mfaStrongUntil,
    deviceId: options.deviceId,
    firebaseTenantId: options.firebaseTenantId,
    firebaseUid: options.firebaseUid,
  };

  const { sid } = await sessionStore.createSession(sessionOptions);

  // Set session cookie
  const sessionConfig = getSessionConfig();
  res.cookie(sessionConfig.cookieName, sid, sessionConfig.cookieOptions);

  return { sid, defaultTenantId };
}

/**
 * Clear user session (for logout)
 */
export async function clearUserSession(sessionId: string, res: Response): Promise<void> {
  // Delete session from Redis
  await sessionStore.deleteSession(sessionId);

  // Clear session cookie
  const sessionConfig = getSessionConfig();
  res.clearCookie(sessionConfig.cookieName, sessionConfig.cookieOptions);
}

/**
 * Update MFA status in session with expiration time
 */
export async function updateMfaStatus(sessionId: string, mfaStrongUntil?: number): Promise<boolean> {
  return await sessionStore.updateSession(sessionId, { mfaStrongUntil });
}

/**
 * Get session info for debugging/admin purposes
 */
export async function getSessionInfo(sessionId: string) {
  return await sessionStore.getSession(sessionId);
}
