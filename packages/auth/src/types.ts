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
