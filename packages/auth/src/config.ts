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

    if (!apiKey || !authDomain || !projectId) {
      throw new Error(
        "Missing required Firebase environment variables. Please set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env.local file."
      );
    }

    cachedConfig = {
      apiKey,
      authDomain,
      projectId,
    };
    return cachedConfig;
  }

  // For server-side, use environment variables (same as client-side)
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      `Firebase environment variables not found for ${env}. Please check your .env file contains required NEXT_PUBLIC_FIREBASE_* variables.`
    );
  }

  cachedConfig = {
    apiKey,
    authDomain,
    projectId,
  };

  console.log("✅ Using Firebase environment variables config");
  return cachedConfig;
}

/**
 * Get Firebase Admin SDK configuration
 * Supports both individual environment variables and JSON service account key
 */
export function getFirebaseAdminConfig() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error(
      "Missing Firebase Admin SDK configuration. Please set NEXT_PUBLIC_FIREBASE_PROJECT_ID."
    );
  }

  // Check if we have a JSON service account key
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      return {
        credential: JSON.parse(serviceAccountKey),
        projectId,
      };
    } catch (error) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      throw new Error(
        "Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Please ensure it's valid JSON."
      );
    }
  }

  // Check if we have individual service account components
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin SDK configuration. Please set either FIREBASE_SERVICE_ACCOUNT_KEY (JSON) or both FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }

  // Construct service account object from individual variables
  const serviceAccount = {
    type: "service_account",
    project_id: projectId,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "default",
    private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
    client_email: clientEmail,
    client_id: process.env.FIREBASE_CLIENT_ID || "default",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
  };

  return {
    credential: serviceAccount,
    projectId,
  };
}
