import { FirebaseConfig } from "./types";

let cachedConfig: FirebaseConfig | null = null;

/**
 * Get Firebase configuration from environment variables
 * Supports both client-side and server-side environments
 */
export function getFirebaseConfig(environment?: string): FirebaseConfig {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = environment || process.env.NODE_ENV || "development";

  // For browser/client-side, use public environment variables
  if (typeof window !== "undefined") {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

    if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
      throw new Error(
        "Missing required Firebase environment variables. Please set NEXT_PUBLIC_FIREBASE_* variables in your .env.local file."
      );
    }

    cachedConfig = {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
    };
    return cachedConfig;
  }

  // For server-side, use environment variables
  const apiKey = process.env.FIREBASE_API_KEY;
  const authDomain = process.env.FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.FIREBASE_APP_ID;
  const measurementId = process.env.FIREBASE_MEASUREMENT_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error(
      `Firebase environment variables not found for ${env}. Please check your .env file contains FIREBASE_* variables.`
    );
  }

  cachedConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };

  console.log("✅ Using Firebase environment variables config");
  return cachedConfig;
}

/**
 * Get Firebase Admin SDK configuration
 */
export function getFirebaseAdminConfig() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccountKey || !projectId) {
    throw new Error(
      "Missing Firebase Admin SDK configuration. Please set FIREBASE_SERVICE_ACCOUNT_KEY and FIREBASE_PROJECT_ID."
    );
  }

  return {
    credential: JSON.parse(serviceAccountKey),
    projectId,
  };
}
