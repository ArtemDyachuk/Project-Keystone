// Types
export * from "./types";

// Configuration
export { getFirebaseConfig, getFirebaseAdminConfig } from "./config";

// Firebase Clients
export { FirebaseClient, FirebaseServerClient } from "./firebase";

// Re-export specific types that might be needed directly
export type { 
  EmailLinkSignUpParams, 
  ActionCodeSettings,
  FirebaseUser,
  SignUpParams,
  SignInParams,
  FirebaseConfig,
  FirebaseAuthError,
  TenantConfig,
  CreateTenantConfig
} from "./types";
