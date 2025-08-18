import { UserRole, ROLES } from "@keystone/auth";
import { SessionData } from "../session/session.store";

export interface MfaRequirement {
  required: boolean;
  reason?: string;
}

/**
 * Default MFA step-up duration: 30 minutes
 */
export const DEFAULT_MFA_DURATION_MS = 30 * 60 * 1000;

/**
 * Check if a role requires step-up MFA
 */
export function requiresStepUpMfa(role?: UserRole): boolean {
  if (!role) return false;

  const adminRoles = [
    ROLES.TENANT_OWNER,
    ROLES.TENANT_ADMIN,
    ROLES.SUPER_ADMIN
  ] as const;

  return adminRoles.includes(role as typeof adminRoles[number]);
}

/**
 * Check if current session has valid step-up MFA for the given role
 */
export function requireStepUp(sessionData: SessionData, targetRole?: UserRole): MfaRequirement {
  // If no role specified or role doesn't require MFA, allow
  if (!targetRole || !requiresStepUpMfa(targetRole)) {
    return { required: false };
  }

  // Check if MFA is still valid
  const now = Date.now();
  if (!sessionData.mfaStrongUntil || sessionData.mfaStrongUntil <= now) {
    return {
      required: true,
      reason: `Strong MFA required for ${targetRole} role access`
    };
  }

  return { required: false };
}

/**
 * Set MFA strong until timestamp (default: 30 minutes from now)
 */
export function setMfaStrongUntil(durationMs: number = DEFAULT_MFA_DURATION_MS): number {
  return Date.now() + durationMs;
}

/**
 * Check if MFA is currently strong (not expired)
 */
export function isMfaStrong(sessionData: SessionData): boolean {
  if (!sessionData.mfaStrongUntil) return false;
  return sessionData.mfaStrongUntil > Date.now();
}

/**
 * Get remaining MFA validity in milliseconds
 */
export function getMfaTimeRemaining(sessionData: SessionData): number {
  if (!sessionData.mfaStrongUntil) return 0;
  const remaining = sessionData.mfaStrongUntil - Date.now();
  return Math.max(0, remaining);
}
