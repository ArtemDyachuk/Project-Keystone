// Firebase Configuration
export { getFirebaseConfig, initializeFirebase, getFirebaseAuth, clearFirebaseCache } from "./firebase/config";

export {
  // Firebase Admin SDK
  initializeFirebaseAdmin,
  getFirebaseAdminAuth,
  getFirebaseAdminFirestore,
  verifyFirebaseToken,
  getFirebaseUser,
  createFirebaseUser,
  updateUserClaims,
  getUserCustomClaims,
  addTenantAccessToUser,
  removeTenantAccessFromUser,
  forceDeleteFirebaseUser,
  checkUserExists,
  
  // Firebase Auth Tenant Management (GIP)
  createFirebaseAuthTenant,
  listFirebaseAuthTenants,
  deleteFirebaseAuthTenant,
  addUserToFirebaseTenant,
  
  // JWT Utilities
  isTokenExpired,
  decodeJwtToken,
} from "./firebase/admin";

export {
  // Firebase Client SDK
  createFirebaseAuthClient,
} from "./firebase/client";

export {
  // Tenant Management Service
  createTenantManagementService,
} from "./firebase/tenant-management";

// RBAC System
export * from "./rbac";

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
