export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  tenantId?: string | null;
  customClaims?: Record<string, unknown>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignUpParams {
  email: string;
  password?: string; // Optional for email-link flow
  displayName?: string;
  tenantId?: string;
}

export interface EmailLinkSignUpParams {
  email: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

export interface ActionCodeSettings {
  url: string;
  handleCodeInApp: boolean;
  iOS?: {
    bundleId: string;
  };
  android?: {
    packageName: string;
    installApp?: boolean;
    minimumVersion?: string;
  };
  dynamicLinkDomain?: string;
}

// Session Management Types
export interface UserSession {
  uid: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  tenantId: string | null;
  selectedCorporationId: string | null; // Current active corporation for multi-tenant users
  roles: string[];
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionData {
  sessionId: string;
  user: UserSession;
  isValid: boolean;
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number;
  path: string;
}

export interface SignInParams {
  email: string;
  password: string;
  tenantId?: string;
}

export interface ResetPasswordParams {
  email: string;
  tenantId?: string;
}

// Redis Session Types
export interface RedisSessionData {
  uid: string;
  email: string;
  displayName: string | null;
  tenantId: string | null;
  selectedCorporationId: string | null;
  roles: string[];
  createdAt: number; // Unix timestamp for Redis efficiency
  lastActivity: number; // Unix timestamp for activity tracking
}

export interface SessionManagerConfig {
  redisUrl?: string;
  sessionTTL: number; // in seconds
  fallbackToMemory: boolean;
}

export interface UpdateProfileParams {
  displayName?: string;
  photoURL?: string;
}

// For creating new tenants (Firebase generates tenantId)
export interface CreateTenantConfig {
  displayName: string;
}

// For existing tenant operations (tenantId is required)
export interface TenantConfig {
  tenantId: string;
  displayName: string;
  allowPasswordSignup: boolean;
  enableEmailLinkSignin: boolean;
}

export interface FirebaseAuthError extends Error {
  code: string;
  message: string;
}
