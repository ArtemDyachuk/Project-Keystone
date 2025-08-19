export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
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
  password: string;
  displayName?: string;
  tenantId?: string;
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

export interface UpdateProfileParams {
  displayName?: string;
  photoURL?: string;
}

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
