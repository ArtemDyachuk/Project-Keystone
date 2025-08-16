import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

let cachedConfig: FirebaseConfig | null = null;

/**
 * Get Firebase configuration from environment variables
 * Only minimal config needed for client-side Firebase Auth
 */
export function getFirebaseConfig(): FirebaseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      "Missing required Firebase environment variables. Please check your .env.local file."
    );
  }

  cachedConfig = {
    apiKey,
    authDomain,
    projectId,
  };

  return cachedConfig;
}

/**
 * Initialize Firebase app (client-side)
 */
export function initializeFirebase() {
  // Avoid reinitializing if already done
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const config = getFirebaseConfig();
  const app = initializeApp(config);

  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth() {
  const app = initializeFirebase();
  return getAuth(app);
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearFirebaseCache(): void {
  cachedConfig = null;
}
