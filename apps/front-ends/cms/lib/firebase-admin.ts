import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
    throw new Error(`Failed to update user claims: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Delete user from Firebase
 */
export async function deleteFirebaseUser(uid: string) {
  try {
    const auth = getFirebaseAdminAuth();
    const db = getFirebaseAdminFirestore();
    
    // Delete user data from Firestore
    await db.collection("users").doc(uid).delete();
    
    // Delete user from Firebase Auth
    await auth.deleteUser(uid);
  } catch (error) {
    throw new Error(`Failed to delete Firebase user: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
