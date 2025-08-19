import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirebaseAdminConfig } from "../config";
import {
  FirebaseUser,
  SignUpParams,
  FirebaseAuthError,
  TenantConfig,
} from "../types";

/**
 * Server-side Firebase Admin SDK client for authentication
 * Focused on server-side operations with multi-tenant support
 */
export class FirebaseServerClient {
  private auth: Auth;

  constructor() {
    // Initialize Firebase Admin SDK if not already initialized
    if (getApps().length === 0) {
      const config = getFirebaseAdminConfig();
      initializeApp({
        credential: cert(config.credential),
        projectId: config.projectId,
      });
    }

    this.auth = getAuth();
  }

  /**
   * Verify ID token from client
   */
  async verifyIdToken(idToken: string, tenantId?: string): Promise<FirebaseUser> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      const decodedToken = await authInstance.verifyIdToken(idToken);
      
      return {
        uid: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerified: decodedToken.email_verified || false,
        displayName: decodedToken.name || null,
        photoURL: decodedToken.picture || null,
        tenantId: decodedToken.firebase?.tenant || null,
        customClaims: decodedToken,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Create user server-side
   */
  async createUser(params: SignUpParams): Promise<FirebaseUser> {
    try {
      const authInstance = params.tenantId 
        ? this.auth.tenantManager().authForTenant(params.tenantId) 
        : this.auth;

      const userRecord = await authInstance.createUser({
        email: params.email,
        password: params.password,
        displayName: params.displayName,
        emailVerified: false,
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        tenantId: params.tenantId || null,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Get user by UID
   */
  async getUserByUid(uid: string, tenantId?: string): Promise<FirebaseUser> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      const userRecord = await authInstance.getUser(uid);

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        tenantId: tenantId || null,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Update user
   */
  async updateUser(uid: string, updates: Partial<FirebaseUser>, tenantId?: string): Promise<FirebaseUser> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      const userRecord = await authInstance.updateUser(uid, {
        email: updates.email || undefined,
        displayName: updates.displayName || undefined,
        photoURL: updates.photoURL || undefined,
        emailVerified: updates.emailVerified,
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        tenantId: tenantId || null,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string, tenantId?: string): Promise<void> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      await authInstance.deleteUser(uid);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Generate password reset link
   */
  async generatePasswordResetLink(email: string, tenantId?: string): Promise<string> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      return await authInstance.generatePasswordResetLink(email);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Set custom claims for user - Careful with custom claims
   */
  async setCustomClaims(uid: string, claims: Record<string, unknown>, tenantId?: string): Promise<void> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      await authInstance.setCustomUserClaims(uid, claims);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Create tenant (GIP multi-tenancy)
   */
  async createTenant(config: TenantConfig): Promise<unknown> {
    try {
      const tenant = await this.auth.tenantManager().createTenant({
        displayName: config.displayName,
      });

      return tenant;
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Get tenant
   */
  async getTenant(tenantId: string): Promise<unknown> {
    try {
      return await this.auth.tenantManager().getTenant(tenantId);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * List tenants - Each company has only one tenant
   */
  async listTenants(maxResults = 100): Promise<unknown> {
    try {
      return await this.auth.tenantManager().listTenants(maxResults);
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
      "auth/email-already-exists": "An account already exists with this email address.",
      "auth/invalid-email": "Invalid email address.",
      "auth/user-disabled": "This account has been disabled.",
      "auth/tenant-not-found": "Tenant not found.",
      "auth/insufficient-permission": "Insufficient permissions for this operation.",
    };

    return errorMessages[code] || "An error occurred during authentication.";
  }
}
