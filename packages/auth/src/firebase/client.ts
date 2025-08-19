import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseConfig } from "../config";
import { FirebaseConfig, SignInParams, FirebaseAuthError } from "../types";

/**
 * Client-side Firebase client for getting ID tokens
 * Use this only when you need client-side authentication (e.g., to get ID tokens)
 * For all server operations, use FirebaseServerClient instead
 */
export class FirebaseClient {
  private app: FirebaseApp;
  private auth: Auth;

  constructor(config?: FirebaseConfig) {
    const firebaseConfig = config || getFirebaseConfig();
    
    // Initialize Firebase app if not already initialized
    if (getApps().length === 0) {
      this.app = initializeApp(firebaseConfig);
    } else {
      this.app = getApps()[0];
    }

    this.auth = getAuth(this.app);
  }

  /**
   * Sign in to get ID token (client-side only)
   */
  async signInForToken(params: SignInParams): Promise<string> {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, params.email, params.password);
      return await credential.user.getIdToken();
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Get current user's ID token
   */
  async getCurrentUserToken(forceRefresh = false): Promise<string | null> {
    try {
      if (!this.auth.currentUser) {
        return null;
      }

      return await this.auth.currentUser.getIdToken(forceRefresh);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Handle Firebase authentication errors
   */
  private handleFirebaseError(error: unknown): FirebaseAuthError {
    const errorCode = (error as { code?: string }).code || "unknown";
    const errorMessage = (error as { message?: string }).message || "An unknown error occurred";
    
    const firebaseError: FirebaseAuthError = {
      name: "FirebaseAuthError",
      code: errorCode,
      message: this.getErrorMessage(errorCode) || errorMessage,
    };

    return firebaseError;
  }

  /**
   * Get user-friendly error messages
   */
  private getErrorMessage(code: string): string {
    const errorMessages: Record<string, string> = {
      "auth/user-not-found": "No account found with this email address.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-email": "Invalid email address.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/too-many-requests": "Too many failed attempts. Please try again later.",
      "auth/network-request-failed": "Network error. Please check your connection.",
    };

    return errorMessages[code] || "An error occurred during authentication.";
  }
}
