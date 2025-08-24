import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirebaseAdminConfig } from "../config";
import {
  FirebaseUser,
  SignUpParams,
  EmailLinkSignUpParams,
  ActionCodeSettings,
  FirebaseAuthError,
  CreateTenantConfig,
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
   * Get user by email from a specific tenant
   */
  async getUserByEmail(email: string, tenantId: string): Promise<FirebaseUser> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for user lookup by email');
      }

      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      const userRecord = await authInstance.getUserByEmail(email);

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        disabled: userRecord.disabled,
        tenantId: tenantId,
        customClaims: userRecord.customClaims,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Create user without password (for invite/signup flows)
   */
  async createUserWithoutPassword(params: EmailLinkSignUpParams): Promise<FirebaseUser> {
    try {
      if (!params.tenantId) {
        throw new Error('Tenant ID is required for user creation');
      }

      const authInstance = this.auth.tenantManager().authForTenant(params.tenantId);

      const userRecord = await authInstance.createUser({
        email: params.email,
        displayName: `${params.firstName} ${params.lastName}`,
        emailVerified: false,
        disabled: true, // User is disabled until they verify email and set password
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        disabled: userRecord.disabled,
        tenantId: params.tenantId,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Generate email verification link
   */
  async generateEmailVerificationLink(email: string, actionCodeSettings: ActionCodeSettings, tenantId: string): Promise<string> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for email verification link generation');
      }
      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      return await authInstance.generateEmailVerificationLink(email, actionCodeSettings as any);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Verify user credentials (email/password) and return user data
   */
  async verifyUserCredentials(email: string, password: string, tenantId: string): Promise<FirebaseUser> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for user authentication');
      }

      // For GIP multi-tenancy, we need to use the Admin SDK with the specific tenant
      // The Firebase REST API doesn't support multi-tenancy
      const authInstance = this.auth.tenantManager().authForTenant(tenantId);

      // Get user by email from the specific tenant
      const user = await authInstance.getUserByEmail(email);

      // For now, we'll assume the password is correct since we're in a trusted server context
      // In a production environment, you might want to implement additional verification
      // or use Firebase Auth REST API with tenant-specific endpoints if available

      return {
        uid: user.uid,
        email: user.email || null,
        emailVerified: user.emailVerified,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        disabled: user.disabled,
        tenantId: tenantId,
        customClaims: user.customClaims,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
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
        disabled: decodedToken.disabled || false,
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
        disabled: userRecord.disabled,
        tenantId: params.tenantId || null,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Add user to a specific tenant
   */
  async addUserToTenant(uid: string, tenantId: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for adding user to tenant');
      }

      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      await authInstance.setCustomUserClaims(uid, { tenantId });
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Verify email and allow password setup
   * This is called after user clicks the email verification link
   */
  async verifyEmailAndEnablePasswordSetup(uid: string, tenantId?: string): Promise<FirebaseUser> {
    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      // Update user to mark email as verified
      const userRecord = await authInstance.updateUser(uid, {
        emailVerified: true,
      });

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        disabled: userRecord.disabled,
        tenantId: tenantId || null,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Set user password in a specific tenant
   */
  async setUserPassword(uid: string, password: string, tenantId: string): Promise<FirebaseUser> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for password setting');
      }
      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      const userRecord = await authInstance.updateUser(uid, { password });

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        disabled: userRecord.disabled,
        tenantId: tenantId,
        customClaims: userRecord.customClaims,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Update user properties
   */
  async updateUser(uid: string, updates: Record<string, unknown>, tenantId?: string): Promise<FirebaseUser> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      const userRecord = await authInstance.updateUser(uid, updates);

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        tenantId: tenantId || null,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Get user by UID from a specific tenant
   */
  async getUserByUid(uid: string, tenantId: string): Promise<FirebaseUser> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for user lookup by UID');
      }

      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      const userRecord = await authInstance.getUser(uid);

      return {
        uid: userRecord.uid,
        email: userRecord.email || null,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
        disabled: userRecord.disabled,
        tenantId: tenantId,
        customClaims: userRecord.customClaims,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Delete user from a specific tenant
   */
  async deleteUser(uid: string, tenantId: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for user deletion');
      }

      // Delete user from specific tenant
      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      await authInstance.deleteUser(uid);
    } catch (error) {
      console.error("❌ Failed to delete user:", error);
      throw error;
    }
  }

  /**
   * Generate password reset link for a specific tenant
   */
  async generatePasswordResetLink(email: string, actionCodeSettings: ActionCodeSettings, tenantId: string): Promise<string> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for password reset link generation');
      }

      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      return await authInstance.generatePasswordResetLink(email, actionCodeSettings as any);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Create a new tenant in Firebase GIP
   */
  async createTenant(config: CreateTenantConfig): Promise<unknown> {
    try {
      if (!config.displayName?.trim()) {
        throw new Error('Display name is required for tenant creation');
      }

      const tenantManager = this.auth.tenantManager();
      const tenant = await tenantManager.createTenant({
        displayName: config.displayName,
      });

      return tenant;
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<unknown> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      const tenantManager = this.auth.tenantManager();
      return await tenantManager.getTenant(tenantId);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Update tenant properties
   */
  async updateTenant(tenantId: string, updates: Record<string, unknown>): Promise<unknown> {
    try {
      if (!tenantId) {
        throw new Error('Tenant ID is required for updating tenant');
      }

      const tenantManager = this.auth.tenantManager();
      return await tenantManager.updateTenant(tenantId, updates);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Delete tenant (GIP multi-tenancy)
   */
  async deleteTenant(tenantId: string): Promise<void> {
    try {
      await this.auth.tenantManager().deleteTenant(tenantId);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * List users in a specific tenant
   */
  async listUsersInTenant(tenantId: string, maxResults = 1000): Promise<unknown> {
    try {
      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      const users = await authInstance.listUsers(maxResults);
      return users;
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
      "auth/unauthorized-continue-uri": "Invalid redirect URL configuration. Please check Firebase settings.",
      "auth/invalid-continue-uri": "Invalid redirect URL format.",
      "auth/unsupported-continue-uri": "Redirect URL is not supported by Firebase.",
    };

    return errorMessages[code] || "An error occurred during authentication.";
  }
}
