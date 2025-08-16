import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

let cachedConfig: FirebaseConfig | null = null;

/**
 * Get Firebase configuration from environment variables
 */
export function getFirebaseConfig(): FirebaseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error(
      "Missing required Firebase environment variables. Please check your .env.local file."
    );
  }

  cachedConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
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

  // Connect to emulators in development
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Only connect to emulators if not already connected
    if (!auth.config.emulator) {
      try {
        connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      } catch (error) {
        console.log("Auth emulator already connected or not available");
      }
    }

    if (!db._delegate._settings?.host?.includes("localhost")) {
      try {
        connectFirestoreEmulator(db, "localhost", 8080);
      } catch (error) {
        console.log("Firestore emulator already connected or not available");
      }
    }
  }

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
 * Get Firestore instance
 */
export function getFirebaseFirestore() {
  const app = initializeFirebase();
  return getFirestore(app);
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearFirebaseCache(): void {
  cachedConfig = null;
}
