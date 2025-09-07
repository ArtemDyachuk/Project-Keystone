// import { getSessionCookie } from './cookies';

export interface CurrentUser {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  tenantId: string | null;
  selectedCorporationId: string | null;
  roles: string[];
  disabled?: boolean; // Optional flag to indicate if user account is disabled
  mfa: boolean; // Whether user has MFA enabled
  authTime: number; // Unix timestamp of last authentication
  mfaEnrolledAt?: number; // Unix timestamp when MFA was enrolled
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  // Use getCurrentUserServer for server-side authentication checks
  const { getCurrentUserServer } = await import('./server');
  const user = await getCurrentUserServer();
  return !!user;
}
