// Firebase Configuration
export { getFirebaseConfig, initializeFirebase, getFirebaseAuth, clearFirebaseCache } from "./firebase/config";

// Firebase Admin SDK
export {
  initializeFirebaseAdmin,
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
  verifyFirebaseToken,
  createFirebaseUser,
  getFirebaseUser,
  updateUserClaims,
  getUserCustomClaims,
  addTenantAccessToUser,
  deleteFirebaseUser,
  forceDeleteFirebaseUser,
  checkUserExists,
  createFirebaseAuthTenant,
  listFirebaseAuthTenants,
  deleteFirebaseAuthTenant,
  removeTenantAccessFromUser,
  forceRefreshUserToken,
  decodeJwtToken
} from "./firebase/admin";

// Firebase Auth Client
export {
  FirebaseAuthClient,
  createFirebaseAuthClient,
  type FirebaseAuthTokens,
  type SignUpParams,
  type SignInParams,
  type ResetPasswordParams,
  type ConfirmResetPasswordParams
} from "./firebase/client";

// Firebase Tenant Management
export {
  TenantManagementService,
  createTenantManagementService,
  type Tenant,
  type UserTenantAccess
} from "./firebase/tenant-management";

// Types
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}
