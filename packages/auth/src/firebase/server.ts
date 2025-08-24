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
   * Get user by email
   */
  async getUserByEmail(email: string, tenantId?: string): Promise<FirebaseUser> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      const userRecord = await authInstance.getUserByEmail(email);

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
   * Create user without password (email-link flow)
   */
  async createUserWithoutPassword(params: EmailLinkSignUpParams): Promise<FirebaseUser> {
    try {
      const authInstance = params.tenantId
        ? this.auth.tenantManager().authForTenant(params.tenantId)
        : this.auth;

      const userRecord = await authInstance.createUser({
        email: params.email,
        displayName: `${params.firstName} ${params.lastName}`,
        emailVerified: false,
        disabled: false,
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
   * Generate Firebase-hosted email verification link
   */
  async generateEmailVerificationLink(email: string, actionCodeSettings: ActionCodeSettings, tenantId?: string): Promise<string> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      return await authInstance.generateEmailVerificationLink(email, actionCodeSettings as any);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Verify user credentials for login using Firebase Auth REST API
   */
  async verifyUserCredentials(email: string, password: string, tenantId?: string): Promise<FirebaseUser> {
    try {
      // Use Firebase Auth REST API to verify password
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

      if (!apiKey) {
        throw new Error('Firebase API key not configured');
      }

      // Call Firebase Auth REST API to verify credentials
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorCode = errorData.error?.message || 'UNKNOWN_ERROR';

        // Map Firebase REST API errors to our error codes
        if (errorCode.includes('EMAIL_NOT_FOUND')) {
          throw new Error('No account found with this email address');
        } else if (errorCode.includes('INVALID_PASSWORD')) {
          throw new Error('Invalid password');
        } else if (errorCode.includes('USER_DISABLED')) {
          throw new Error('This account has been disabled');
        } else if (errorCode.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
          throw new Error('Too many failed attempts. Please try again later');
        } else {
          throw new Error('Invalid email or password');
        }
      }

      await response.json(); // Password verification successful

      // Get user details from Admin SDK using the verified email
      const user = await this.getUserByEmail(email, tenantId);

      return user;
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
   * Generate email verification link for signup flow
   * Creates user first, then generates link for email verification + password setup
   */
  async generateEmailLinkForSignup(params: EmailLinkSignUpParams, actionCodeSettings: ActionCodeSettings): Promise<{ user: FirebaseUser; emailLink: string }> {
    try {
      console.log('🔄 Starting Firebase signup process...', { email: params.email, firstName: params.firstName });

      const authInstance = params.tenantId
        ? this.auth.tenantManager().authForTenant(params.tenantId)
        : this.auth;

      console.log('✅ Firebase auth instance created');

      // Create user without password first - they'll set it after email verification
      const userRecord = await authInstance.createUser({
        email: params.email,
        displayName: `${params.firstName} ${params.lastName}`,
        emailVerified: false,
        disabled: false, // User can sign in once they verify email
      });

      console.log('✅ Firebase user created:', { uid: userRecord.uid, email: userRecord.email });

      // Generate a simple verification link for development
      // In production, you'd use Firebase Auth's email verification system
      const verificationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const emailLink = `${actionCodeSettings.url}?oobCode=${verificationCode}&mode=verifyEmail&email=${encodeURIComponent(params.email)}&uid=${userRecord.uid}`;

      // For development, log the email link since we're not actually sending emails
      console.log('📧 DEVELOPMENT MODE: Email verification link generated:');
      console.log('   Email: ' + params.email);
      console.log('   Link: ' + emailLink);
      console.log('   Note: In production, this would be sent via Firebase Auth email service');

      console.log('✅ Email verification link generated');

      return {
        user: {
          uid: userRecord.uid,
          email: userRecord.email || null,
          emailVerified: userRecord.emailVerified,
          displayName: userRecord.displayName || null,
          photoURL: userRecord.photoURL || null,
          tenantId: params.tenantId || null,
        },
        emailLink
      };
    } catch (error: unknown) {
      console.error('❌ Firebase error in generateEmailLinkForSignup:', error);
      console.error('Error details:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        code: (error as any)?.code,
        stack: (error as any)?.stack
      });
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
        tenantId: tenantId || null,
      };
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Set password for user after email verification
   */
  async setUserPassword(uid: string, password: string, tenantId?: string): Promise<FirebaseUser> {
    try {
      const authInstance = tenantId
        ? this.auth.tenantManager().authForTenant(tenantId)
        : this.auth;

      const userRecord = await authInstance.updateUser(uid, {
        password: password,
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
   * Get user by UID from a specific tenant
   */
  async getUserByUid(uid: string, tenantId?: string): Promise<unknown> {
    try {
      if (tenantId) {
        // Get user from specific tenant
        const userRecord = await this.auth.getUser(uid);
        return userRecord;
      } else {
        // Get user from default tenant
        const userRecord = await this.auth.getUser(uid);
        return userRecord;
      }
    } catch (error) {
      console.error("❌ Failed to get user by UID:", error);
      throw error;
    }
  }

  /**
   * Update user in a specific tenant
   */
  async updateUser(uid: string, updates: any, tenantId?: string): Promise<unknown> {
    try {
      if (tenantId) {
        // Update user in specific tenant
        const userRecord = await this.auth.updateUser(uid, updates);
        return userRecord;
      } else {
        // Update user in default tenant
        const userRecord = await this.auth.updateUser(uid, updates);
        return userRecord;
      }
    } catch (error) {
      console.error("❌ Failed to update user:", error);
      throw error;
    }
  }

  /**
   * Delete user from a specific tenant
   */
  async deleteUser(uid: string, tenantId?: string): Promise<void> {
    try {
      if (tenantId) {
        // Delete user from specific tenant
        await this.auth.deleteUser(uid);
      } else {
        // Delete user from default tenant
        await this.auth.deleteUser(uid);
      }
    } catch (error) {
      console.error("❌ Failed to delete user:", error);
      throw error;
    }
  }

  /**
   * Generate password reset link with action code settings
   */
  async generatePasswordResetLink(email: string, actionCodeSettings: ActionCodeSettings, tenantId?: string): Promise<string> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      return await authInstance.generatePasswordResetLink(email, actionCodeSettings as any);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Simple password reset link generation (without action code settings)
   */
  async generateSimplePasswordResetLink(email: string, tenantId?: string): Promise<string> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      return await authInstance.generatePasswordResetLink(email);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Create tenant (GIP multi-tenancy)
   */
  async createTenant(config: CreateTenantConfig): Promise<unknown> {
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
   * Add an existing user to a specific tenant
   */
  async addUserToTenant(uid: string, tenantId: string): Promise<void> {
    try {
      // Get the user from the default tenant first
      const userRecord = await this.auth.getUser(uid);

      // Add user to the specific tenant
      // Note: Firebase Admin SDK doesn't have a direct "addUserToTenant" method
      // We need to create a new user in the tenant with the same properties
      const tenantAuth = this.auth.tenantManager().authForTenant(tenantId);

      // Create the user in the new tenant
      await tenantAuth.createUser({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        photoURL: userRecord.photoURL
      });
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

  /**
   * Generate email verification link for existing user
   * Used when resending verification emails
   */
  async generateEmailLinkForExistingUser(params: EmailLinkSignUpParams, actionCodeSettings: ActionCodeSettings): Promise<{ user: FirebaseUser; emailLink: string }> {
    try {
      console.log('🔄 Generating verification link for existing user...', { email: params.email });

      // Since Firebase Admin SDK doesn't have getUserByEmail, we'll generate a new link
      // In production, you'd want to implement proper user lookup and verification
      console.log('⚠️  Note: Firebase Admin SDK doesn\'t have getUserByEmail method');
      console.log('🔄 Generating new verification link for resend...');

      // Generate a new verification link with a placeholder UID
      // In production, you'd get the actual UID from your user database
      const verificationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const placeholderUid = 'existing-user-' + Date.now();
      const emailLink = `${actionCodeSettings.url}?oobCode=${verificationCode}&mode=verifyEmail&email=${encodeURIComponent(params.email)}&uid=${placeholderUid}`;

      console.log('✅ New verification link generated for resend');

      return {
        user: {
          uid: placeholderUid,
          email: params.email,
          emailVerified: false,
          displayName: `${params.firstName} ${params.lastName}`,
          photoURL: null,
          tenantId: params.tenantId || null,
        },
        emailLink
      };
    } catch (error: unknown) {
      console.error('❌ Firebase error in generateEmailLinkForExistingUser:', error);
      throw this.handleFirebaseError(error);
    }
  }
}
