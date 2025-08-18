import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Check if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJwtToken(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true; // If we can't decode, assume expired
  }
}

/**
 * Decode JWT token without verification (for development/debugging only)
 * Note: This does not verify the signature, use verifyFirebaseToken for production
 */
export function decodeJwtToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    return payload;
  } catch (error) {
    throw new Error(`JWT decode failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Initialize Firebase Admin SDK (server-side)
 */
export function initializeFirebaseAdmin() {
  // Avoid reinitializing if already done
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId || !privateKey || !clientEmail) {
    throw new Error(
      "Missing Firebase Admin credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in your environment."
    );
  }

  const app = initializeApp({
    credential: cert({
      projectId,
      privateKey,
      clientEmail,
    }),
    projectId,
  });

  return app;
}

/**
 * Get Firebase Admin Auth instance
 */
export function getFirebaseAdminAuth() {
  const app = initializeFirebaseAdmin();
  return getAuth(app);
}

/**
 * Get Firebase Admin Firestore instance
 */
export function getFirebaseAdminFirestore() {
  const app = initializeFirebaseAdmin();
  return getFirestore(app);
}

/**
 * Verify Firebase ID token (server-side)
 */
export async function verifyFirebaseToken(idToken: string) {
  try {
    const auth = getFirebaseAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error(`Firebase token verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get user by UID (server-side)
 */
export async function getFirebaseUser(uid: string) {
  try {
    const auth = getFirebaseAdminAuth();
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    throw new Error(`Failed to get Firebase user: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Create user in Firebase (server-side)
 */
export async function createFirebaseUser(email: string, password: string, userData?: {
  displayName?: string;
  firstName?: string;
  lastName?: string;
}) {
  try {
    const auth = getFirebaseAdminAuth();

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: userData?.displayName || `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim(),
      emailVerified: false,
    });

    // Store additional user data in Firestore
    if (userData) {
      const db = getFirebaseAdminFirestore();
      await db.collection("users").doc(userRecord.uid).set({
        email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: new Date(),
        tenantIds: [],
        selectedTenantId: null,
      });
    }

    return userRecord;
  } catch (error) {
    throw new Error(`Failed to create Firebase user: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Update user custom claims (for multi-tenancy and RBAC)
 */
export async function updateUserClaims(uid: string, claims: Record<string, any>) {
  try {
    const auth = getFirebaseAdminAuth();
    await auth.setCustomUserClaims(uid, claims);
  } catch (error) {
    console.error("❌ updateUserClaims failed:", error);
    throw new Error(`Failed to update user claims: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get current custom claims for a user (server-side)
 */
export async function getUserCustomClaims(uid: string): Promise<Record<string, any>> {
  const auth = getFirebaseAdminAuth();
  const user = await auth.getUser(uid);
  return (user.customClaims as Record<string, any>) || {};
}

/**
 * Add or update tenant access in user's custom claims
 * - Ensures tenantIds array exists and includes the tenantId
 * - Ensures tenantRoles map has role for the tenantId
 * - Sets selectedTenantId if not already set
 */
export async function addTenantAccessToUser(
  uid: string,
  tenantId: string,
  role: string = "admin"
): Promise<void> {
  try {
    // Import the tenant management service
    const { createTenantManagementService } = await import("./tenant-management");
    const tenantService = createTenantManagementService();

    // Add user to the tenant
    await tenantService.addUserToTenant(uid, tenantId, role as "admin" | "user" | "viewer");

    // Now also set custom claims for backward compatibility
    const current = await getUserCustomClaims(uid);

    const tenantIds: string[] = Array.isArray(current.tenantIds) ? [...current.tenantIds] : [];
    const tenantRoles: Record<string, string> = typeof current.tenantRoles === "object" && current.tenantRoles !== null
      ? { ...current.tenantRoles }
      : {};

    if (!tenantIds.includes(tenantId)) {
      tenantIds.push(tenantId);
    }
    tenantRoles[tenantId] = role;

    const selectedTenantId = current.selectedTenantId || tenantId;

    const newClaims = {
      ...current,
      tenantIds,
      tenantRoles,
      selectedTenantId,
    };

    await updateUserClaims(uid, newClaims);

  } catch (error) {
    console.error("❌ Failed to add user to tenant:", error);
    throw new Error(`Failed to add user to tenant: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Delete user from Firebase
 */
export async function deleteFirebaseUser(uid: string) {
  try {
    const auth = getFirebaseAdminAuth();
    await auth.deleteUser(uid);
  } catch (error) {
    throw new Error(`Failed to delete Firebase user: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Force delete user from Firebase (immediate deletion)
 * This bypasses the normal deletion delay
 */
export async function forceDeleteFirebaseUser(uid: string) {
  try {
    const auth = getFirebaseAdminAuth();
    await auth.deleteUser(uid);
    return true;
  } catch (error) {
    console.error(`❌ Force delete failed for user ${uid}:`, error);
    throw new Error(`Failed to force delete Firebase user: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Check if user exists and get their status
 */
export async function checkUserExists(uid: string) {
  try {
    const auth = getFirebaseAdminAuth();
    const userRecord = await auth.getUser(uid);
    return {
      exists: true,
      disabled: userRecord.disabled,
      emailVerified: userRecord.emailVerified,
      metadata: userRecord.metadata
    };
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return { exists: false };
    }
    throw error;
  }
}



/**
 * Sanitize tenant name for Firebase Auth tenant creation
 * Firebase Auth tenant names must:
 * - Start with a letter (A-Z, a-z)
 * - Only contain letters, digits, and hyphens
 * - Be 4-20 characters long
 */
function sanitizeTenantName(name: string): string {
  // Remove special characters, keep only letters, digits, hyphens
  let sanitized = name.replace(/[^a-zA-Z0-9-]/g, "");

  // Ensure it starts with a letter
  if (!/^[a-zA-Z]/.test(sanitized)) {
    sanitized = "Tenant" + sanitized;
  }

  // Ensure length is between 4-20 characters
  if (sanitized.length < 4) {
    sanitized = sanitized + "Org";
  } else if (sanitized.length > 20) {
    sanitized = sanitized.substring(0, 20);
  }

  return sanitized;
}

/**
 * Create a new tenant in Firebase Auth (if GIP multi-tenancy is enabled)
 * This creates a real authentication tenant namespace
 */
export async function createFirebaseAuthTenant(tenantData: {
  displayName: string;
  allowPasswordSignUp?: boolean;
  allowEmailLinkSignIn?: boolean;
}): Promise<{ tenantId: string; name: string }> {
  try {
    // Note: This requires Google Identity Platform multi-tenancy to be enabled
    // If not enabled, this will throw an error
    const auth = getFirebaseAdminAuth();

    // Use tenantManager() for GIP multi-tenancy operations
    const tenantManager = (auth as any).tenantManager();

    if (!tenantManager) {
      throw new Error('Firebase Auth tenant manager not available. Please enable Google Identity Platform multi-tenancy.');
    }

    // Sanitize the display name for Firebase Auth requirements
    const sanitizedName = sanitizeTenantName(tenantData.displayName);

    // Create tenant in Firebase Auth using tenantManager
    const tenant = await tenantManager.createTenant({
      displayName: sanitizedName,
    });

    // Enable Email/Password provider for the tenant using REST API
    try {
      await enableEmailPasswordProviderViaAPI(tenant.tenantId);
      console.log(`✅ Enabled Email/Password provider for tenant ${tenant.tenantId}`);
    } catch (providerError) {
      console.warn(`⚠️ Failed to configure authentication providers for tenant ${tenant.tenantId}:`, providerError);
      // Don't fail the whole operation - tenant is still created
    }

    return {
      tenantId: tenant.tenantId,
      name: tenant.displayName || sanitizedName,
    };
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      console.warn('⚠️ Firebase Auth tenant creation not allowed - GIP multi-tenancy may not be enabled');
      throw new Error('Firebase Auth tenant creation not enabled. Please enable Google Identity Platform multi-tenancy.');
    }
    throw new Error(`Failed to create Firebase Auth tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all Firebase Auth tenants (if GIP multi-tenancy is enabled)
 */
export async function listFirebaseAuthTenants(): Promise<Array<{ tenantId: string; displayName: string }>> {
  try {
    const auth = getFirebaseAdminAuth();

    // Use tenantManager() for GIP multi-tenancy operations
    const tenantManager = (auth as any).tenantManager();

    if (!tenantManager) {
      console.warn('⚠️ Firebase Auth tenant manager not available - GIP multi-tenancy may not be enabled');
      return [];
    }

    const tenants = await tenantManager.listTenants();

    return tenants.tenants.map((tenant: any) => ({
      tenantId: tenant.tenantId,
      displayName: tenant.displayName || 'Unnamed Tenant',
    }));
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      console.warn('⚠️ Firebase Auth tenant listing not allowed - GIP multi-tenancy may not be enabled');
      return [];
    }
    throw new Error(`Failed to list Firebase Auth tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enable Email/Password provider via Firebase REST API
 */
async function enableEmailPasswordProviderViaAPI(tenantId: string): Promise<void> {
  try {
    // Get access token for Firebase REST API
    const auth = getFirebaseAdminAuth();
    const accessToken = await auth.app.options.credential?.getAccessToken();
    
    if (!accessToken) {
      throw new Error('Failed to get access token for Firebase REST API');
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('Firebase project ID not configured');
    }

    // Firebase Identity Platform REST API endpoint for tenant configuration
    const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/tenants/${tenantId}/inboundSamlConfigs`;
    
    // Actually, let's use the correct endpoint for enabling email/password
    const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/tenants/${tenantId}:updateConfig`;
    
    const response = await fetch(configUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signIn: {
          email: {
            enabled: true,
            passwordRequired: true,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firebase REST API error: ${response.status} ${errorText}`);
    }

    console.log(`✅ Enabled Email/Password provider via REST API for tenant ${tenantId}`);
  } catch (error) {
    console.error('Failed to enable Email/Password provider via REST API:', error);
    throw error;
  }
}

/**
 * Enable Email/Password provider for an existing Firebase Auth tenant
 */
export async function enableEmailPasswordForTenant(tenantId: string): Promise<void> {
  try {
    await enableEmailPasswordProviderViaAPI(tenantId);
    console.log(`✅ Enabled Email/Password provider for existing tenant ${tenantId}`);
  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Firebase Auth tenant update not enabled. Please enable Google Identity Platform multi-tenancy.');
    }
    throw new Error(`Failed to enable Email/Password for tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a Firebase Auth tenant (GIP multi-tenancy)
 */
export async function deleteFirebaseAuthTenant(tenantId: string): Promise<void> {
  try {
    const auth = getFirebaseAdminAuth();

    // Use tenantManager() for GIP multi-tenancy operations
    const tenantManager = (auth as any).tenantManager();

    if (!tenantManager) {
      throw new Error('Firebase Auth tenant manager not available. Please enable Google Identity Platform multi-tenancy.');
    }

    // Delete tenant in Firebase Auth using tenantManager
    await tenantManager.deleteTenant(tenantId);


  } catch (error: any) {
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Firebase Auth tenant deletion not enabled. Please enable Google Identity Platform multi-tenancy.');
    }
    throw new Error(`Failed to delete Firebase Auth tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Remove tenant access from user's custom claims
 */
export async function removeTenantAccessFromUser(
  uid: string,
  tenantId: string
): Promise<void> {
  const current = await getUserCustomClaims(uid);

  const tenantIds: string[] = Array.isArray(current.tenantIds)
    ? current.tenantIds.filter(id => id !== tenantId)
    : [];

  const tenantRoles: Record<string, string> = typeof current.tenantRoles === "object" && current.tenantRoles !== null
    ? { ...current.tenantRoles }
    : {};

  // Remove the tenant role
  delete tenantRoles[tenantId];

  // Update selectedTenantId if it was the deleted tenant
  let selectedTenantId = current.selectedTenantId;
  if (selectedTenantId === tenantId) {
    selectedTenantId = tenantIds.length > 0 ? tenantIds[0] : undefined;
  }

  await updateUserClaims(uid, {
    ...current,
    tenantIds,
    tenantRoles,
    selectedTenantId,
  });
}

/**
 * Force refresh a user's Firebase ID token
 * This invalidates the current token and forces the user to get a new one
 * Useful after updating custom claims
 */
export async function forceRefreshUserToken(uid: string): Promise<void> {
  try {
    const auth = getFirebaseAdminAuth();

    // Revoke all refresh tokens for the user
    // This will invalidate all existing ID tokens
    await auth.revokeRefreshTokens(uid);
  } catch (error) {
    console.error(`❌ Failed to revoke refresh tokens for user ${uid}:`, error);
    throw new Error(`Failed to refresh user token: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Add user to a Firebase Auth tenant (GIP multi-tenancy)
 * Note: Firebase Auth tenants don't have built-in user management
 * We use custom claims to track user-tenant relationships
 */
export async function addUserToFirebaseTenant(tenantId: string, userId: string, role: "admin" | "user" | "viewer" = "admin"): Promise<void> {
  try {
    const auth = getFirebaseAdminAuth();

    // Verify the tenant exists first
    const tenantManager = (auth as any).tenantManager();
    if (!tenantManager) {
      throw new Error('Firebase Auth tenant manager not available. Please enable Google Identity Platform multi-tenancy.');
    }

    try {
      // Try to get the tenant to verify it exists
      await tenantManager.getTenant(tenantId);
    } catch (tenantError: any) {
      if (tenantError.code === 'auth/tenant-not-found') {
        throw new Error(`Firebase Auth tenant ${tenantId} not found`);
      }
      throw tenantError;
    }

    // Get current user to see existing custom claims
    const userRecord = await auth.getUser(userId);
    const currentClaims = userRecord.customClaims || {};

    // Update custom claims with new tenant
    const tenantIds = Array.isArray(currentClaims.tenantIds) ? [...currentClaims.tenantIds] : [];
    const tenantRoles = typeof currentClaims.tenantRoles === "object" && currentClaims.tenantRoles !== null
      ? { ...currentClaims.tenantRoles }
      : {};

    if (!tenantIds.includes(tenantId)) {
      tenantIds.push(tenantId);
    }

    tenantRoles[tenantId] = role;
    const selectedTenantId = currentClaims.selectedTenantId || tenantId;

    const newClaims = {
      ...currentClaims,
      tenantIds,
      tenantRoles,
      selectedTenantId,
    };

    // Update the user's custom claims
    await auth.setCustomUserClaims(userId, newClaims);

  } catch (error: any) {
    console.error(`❌ Failed to add user to Firebase Auth tenant:`, error);

    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Firebase Auth tenant user management not enabled. Please enable Google Identity Platform multi-tenancy.');
    }

    if (error.code === 'auth/user-not-found') {
      throw new Error(`User ${userId} not found in Firebase Auth`);
    }

    if (error.code === 'auth/tenant-not-found') {
      throw new Error(`Firebase Auth tenant ${tenantId} not found`);
    }

    throw new Error(`Failed to add user to Firebase Auth tenant: ${error.message || 'Unknown error'}`);
  }
}
