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
  MfaEnrollResponse,
  MfaSignInResponse,
  MfaFactor,
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
      return await authInstance.generateEmailVerificationLink(email, actionCodeSettings as unknown as any);
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

      // First, verify password using Firebase Auth REST API with tenant support
      const authResponse = await this.verifyPasswordWithREST(email, password, tenantId);

      // Then get full user data from Admin SDK using the correct tenant
      const authInstance = this.auth.tenantManager().authForTenant(tenantId);
      const user = await authInstance.getUser(authResponse.localId);

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
      // swallow internal detail; rethrow standardized error
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Verify password using Firebase Auth REST API with multi-tenant support
   */
  async verifyPasswordWithREST(email: string, password: string, tenantId: string) {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error('Firebase API key not configured');
    }

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        tenantId, // Use the correct tenant ID from database
        returnSecureToken: true
      })
    });

    if (!response.ok) {
      const rawText = await response.text();
      let errorCode = 'Authentication failed';
      try {
        const parsed = JSON.parse(rawText);
        errorCode = parsed.error?.message || errorCode;
      } catch {
        // Failed to parse error response as JSON
      }

      // Map Firebase error codes to user-friendly messages
      if (errorCode.includes('INVALID_LOGIN_CREDENTIALS') ||
        errorCode.includes('EMAIL_NOT_FOUND') ||
        errorCode.includes('INVALID_PASSWORD')) {
        throw new Error('Invalid email or password');
      }

      if (errorCode.includes('PASSWORD_LOGIN_DISABLED')) {
        throw new Error('Password authentication is disabled. Please contact your administrator.');
      }

      throw new Error(errorCode);
    }

    return await response.json();
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
   * Create custom token for user
   */
  async createCustomToken(uid: string, tenantId?: string): Promise<string> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      return await authInstance.createCustomToken(uid);
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Get user's MFA factors
   */
  async getMfaFactors(uid: string, tenantId?: string): Promise<MfaFactor[]> {
    try {
      // Use the correct tenant
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      const user = await authInstance.getUser(uid);

      // Extract MFA factors from user's multiFactor property
      const mfaFactors: MfaFactor[] = [];

      // Check if multiFactor property exists and has enrolledFactors
      if (user && (user as any).multiFactor && (user as any).multiFactor.enrolledFactors) {
        const enrolledFactors = (user as any).multiFactor.enrolledFactors;
        for (const factor of enrolledFactors) {
          mfaFactors.push({
            id: (factor.uid || factor.id || 'unknown') as string,
            label: (factor.displayName || 'Authenticator App') as string,
            type: factor.factorId === 'phone' ? 'phone' : 'totp'
          });
        }
      }

      return mfaFactors;
    } catch {
      // Log the error for debugging but don't throw - MFA check should not block login
      // non-fatal mfa factor lookup
      return []; // Return empty array if MFA check fails
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
    if (!tenantId) {
      throw new Error('Tenant ID is required for user deletion');
    }

    // Delete user from specific tenant
    const authInstance = this.auth.tenantManager().authForTenant(tenantId);
    await authInstance.deleteUser(uid);
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
      return await authInstance.generatePasswordResetLink(email, actionCodeSettings as unknown as any);
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

      // Enable email/password provider for the new tenant
      const tenantId = (tenant as any).tenantId;
      if (tenantId) {
        await this.enableEmailPasswordProvider(tenantId);

        // Enable MFA TOTP for this specific tenant
        try {
          await this.enableMfaTotpForTenant(tenantId);
        } catch {
          // keep minimal signal; do not spam logs
          console.warn(`Failed to enable MFA TOTP for tenant ${tenantId}`);
          // Don't fail tenant creation if MFA enablement fails
        }
      }

      // Ensure MFA TOTP is enabled at project level
      try {
        await this.enableMfaTotp();
      } catch {
        console.warn('Failed to enable MFA TOTP at project level');
        // Don't fail tenant creation if MFA enablement fails
      }

      return tenant;
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Enable email/password provider for a tenant
   */
  async enableEmailPasswordProvider(tenantId: string): Promise<void> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error('Firebase API key not configured');
      }

      // Enable email/password provider using Firebase Auth REST API
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/tenants/${tenantId}/config?key=${apiKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signInConfig: {
            allowPasswordSignup: true,
            email: {
              enabled: true,
              passwordRequired: true
            }
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to enable email/password provider');
      }

      // success
    } catch {
      console.warn(`Failed to enable email/password provider for tenant ${tenantId}`);
      // Don't throw - tenant creation should still succeed even if provider enablement fails
    }
  }

  /**
   * Enable MFA TOTP for a specific tenant using Admin SDK
   */
  async enableMfaTotpForTenant(tenantId: string): Promise<void> {
    try {
      // enabling tenant mfa

      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error('Firebase project ID not configured');
      }

      // Use REST API to enable MFA TOTP for the tenant
      const url = `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/tenants/${tenantId}?updateMask=mfaConfig`;

      // Get access token using gcloud
      const { execSync } = await import('child_process');
      const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Goog-User-Project': projectId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `projects/${projectId}/tenants/${tenantId}`,
          mfaConfig: {
            state: 'ENABLED',
            providerConfigs: [
              {
                state: 'ENABLED',
                totpProviderConfig: { adjacentIntervals: 1 }
              }
            ]
          }
        })
      });

      if (!response.ok) {
        // keep concise error
        console.warn(`Failed to enable MFA for tenant ${tenantId}: ${response.status}`);
        throw new Error(`Failed to enable MFA for tenant: ${response.status} ${response.statusText}`);
      }

      await response.json();
      // enabled for tenant
    } catch (error: unknown) {
      console.warn(`Error enabling MFA TOTP for tenant ${tenantId}`);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Check if MFA TOTP is enabled at the project level
   */
  async isMfaTotpEnabled(): Promise<boolean> {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error('FIREBASE_PROJECT_ID environment variable not set');
      }

      // Get access token using gcloud
      const { execSync } = await import('child_process');
      const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Goog-User-Project': projectId,
          },
        }
      );

      if (!response.ok) {
        console.warn('Failed to check MFA status');
        return false;
      }

      const config = await response.json();
      const mfaConfig = config.mfa;

      if (mfaConfig && mfaConfig.providerConfigs) {
        return mfaConfig.providerConfigs.some((provider: Record<string, unknown>) =>
          provider.state === 'ENABLED' && provider.totpProviderConfig
        );
      }

      return false;
    } catch {
      // non-fatal check
      return false;
    }
  }

  /**
   * Enable MFA TOTP at the project level using Identity Platform API
   */
  async enableMfaTotp(): Promise<void> {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      if (!projectId) {
        throw new Error('FIREBASE_PROJECT_ID environment variable not set');
      }

      // Check if MFA is already enabled
      const isEnabled = await this.isMfaTotpEnabled();
      if (isEnabled) {
        // already enabled
        return;
      }

      // Get access token using gcloud
      const { execSync } = await import('child_process');
      const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=mfa`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Goog-User-Project': projectId,
          },
          body: JSON.stringify({
            mfa: {
              providerConfigs: [{
                state: 'ENABLED',
                totpProviderConfig: { adjacentIntervals: 1 }
              }]
            }
          }),
        }
      );

      if (!response.ok) {
        console.warn(`Failed to enable MFA TOTP: ${response.status}`);
        throw new Error(`Failed to enable MFA TOTP: ${response.status} ${response.statusText}`);
      }

      // enabled at project level
    } catch (error: unknown) {
      console.warn('Error enabling MFA TOTP');
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
   * Enable email/password provider for an existing tenant
   * This can be used to fix tenants that were created without password auth enabled
   */
  async enableEmailPasswordForExistingTenant(tenantId: string): Promise<void> {
    return this.enableEmailPasswordProvider(tenantId);
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
   * Find user by email across all tenants (optimized for login)
   * This method searches all tenants to find a user by email
   */
  async findUserByEmailAcrossTenants(email: string, tenantIds: string[]): Promise<{ user: FirebaseUser; tenantId: string } | null> {
    try {
      // Search tenants in parallel for better performance
      const searchPromises = tenantIds.map(async (tenantId) => {
        try {
          const user = await this.getUserByEmail(email, tenantId);
          return { user, tenantId };
        } catch {
          return null; // User not found in this tenant
        }
      });

      const results = await Promise.all(searchPromises);
      const found = results.find(result => result !== null);

      return found || null;
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
   * Start MFA enrollment process using Firebase GIP REST API
   */
  async enrollStart(idToken: string, tenantId?: string): Promise<MfaEnrollResponse> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error('Firebase API key not configured');
      }

      // Use Firebase GIP REST API v2 for TOTP enrollment (scope by tenant via query param)
      const url = `https://identitytoolkit.googleapis.com/v2/accounts/mfaEnrollment:start?key=${apiKey}${tenantId ? `&tenantId=${tenantId}` : ""}`;

      const requestBody = {
        idToken: idToken,
        totpEnrollmentInfo: {},
        displayName: 'Authenticator App',
        ...(tenantId && { tenantId: tenantId })
      };

      let response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();


        // Auto-enable TOTP on tenant and retry once if not enabled
        const isOpNotAllowed = errorText.includes('OPERATION_NOT_ALLOWED') || errorText.includes('TOTP based MFA not enabled');
        if (tenantId && isOpNotAllowed) {
          await this.enableMfaTotpForTenant(tenantId);

          // Retry once after enabling
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            await response.text();
            throw new Error(`Firebase MFA enrollment failed: ${response.status} ${response.statusText}`);
          }
        } else {
          throw new Error(`Firebase MFA enrollment failed: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();

      // v2 response shape uses totpSessionInfo
      const sharedSecretKey: string | undefined = data.totpSessionInfo?.sharedSecretKey || data.totpEnrollmentInfo?.secretKey;
      const sessionInfoValue: string | undefined = data.totpSessionInfo?.sessionInfo || data.sessionInfo;

      if (!sharedSecretKey) {
        throw new Error('No TOTP secret received from Firebase');
      }

      // Create the OTPAUTH URL for QR code generation
      const issuer = 'Keystone';
      const accountName = 'user';
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${sharedSecretKey}&issuer=${encodeURIComponent(issuer)}`;

      return {
        sessionInfo: sessionInfoValue || `totp_session_${Date.now()}`,
        qrCodeUrl: '', // Will be generated on the frontend using the otpauthUrl
        otpauthUrl: otpauthUrl,
      };
    } catch (error: unknown) {
      // enrollment error
      throw this.handleFirebaseError(error);
    }
  }


  /**
   * Complete MFA enrollment with verification code using Firebase GIP REST API
   */
  async enrollFinish(idToken: string, verificationCode: string, sessionInfo: string, tenantId?: string): Promise<MfaEnrollResponse> {
    try {

      // Validate the verification code format (should be 6 digits)
      if (!/^\d{6}$/.test(verificationCode)) {
        throw new Error('Invalid verification code format. Must be 6 digits.');
      }

      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error('Firebase API key not configured');
      }

      // Use Firebase GIP REST API v2 for TOTP enrollment finalization
      const url = `https://identitytoolkit.googleapis.com/v2/accounts/mfaEnrollment:finalize?key=${apiKey}${tenantId ? `&tenantId=${tenantId}` : ""}`;

      const requestBody = {
        idToken: idToken,
        displayName: 'Authenticator App',
        totpVerificationInfo: {
          verificationCode: verificationCode,
          sessionInfo: sessionInfo
        },
        ...(tenantId && { tenantId: tenantId })
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        await response.text();
        throw new Error(`Firebase MFA enrollment finalize failed: ${response.status} ${response.statusText}`);
      }

      await response.json();

      return {
        sessionInfo: `completed_${sessionInfo}`,
        qrCodeUrl: '',
        otpauthUrl: '',
      };
    } catch (error: unknown) {
      // enrollment finalize error
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Finalize MFA sign-in with verification code
   * Since Firebase REST API doesn't support MFA directly, we'll verify the TOTP code
   * and create a custom token for the user
   */
  async signInFinalize(
    mfaPendingCredential: string,
    verificationCode: string,
    tenantId: string | undefined,
    userId: string
  ): Promise<MfaSignInResponse> {
    try {
      // start finalize

      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error("Firebase API key not configured");
      }

      // Resolve user's TOTP enrollmentId (required by REST finalize)
      if (!userId) {
        throw new Error("User ID is required to finalize MFA sign-in");
      }
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;
      const userRecord = await authInstance.getUser(userId);
      const enrolledFactors = userRecord.multiFactor?.enrolledFactors || [];
      const totpFactor = enrolledFactors.find((f: any) => f.factorId === "totp") || enrolledFactors[0];
      if (!totpFactor?.uid) {
        throw new Error("No TOTP MFA factor found for user");
      }
      const mfaEnrollmentId: string = totpFactor.uid;

      // Identity Platform v2 endpoint: finalize MFA sign-in
      const url = `https://identitytoolkit.googleapis.com/v2/accounts/mfaSignIn:finalize?key=${apiKey}`;

      const requestBody: Record<string, unknown> = {
        mfaPendingCredential,
        mfaEnrollmentId,
        totpVerificationInfo: {
          verificationCode,
        },
      };

      if (tenantId) {
        requestBody.tenantId = tenantId;
      }

      // call finalize

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // status observed

      const text = await response.text();
      let data: Record<string, unknown>;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        // non-json response
        throw new Error(`MFA finalize returned non-JSON (${response.status})`);
      }

      if (!response.ok) {
        // error body captured
        const message = (data?.error as any)?.message || "MFA sign-in finalize failed";
        throw new Error(message);
      }

      return {
        idToken: data.idToken as string,
        refreshToken: data.refreshToken as string,
        expiresIn: data.expiresIn as string,
        localId: data.localId as string,
      };
    } catch (error: unknown) {
      // finalize error
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Withdraw MFA factor using Admin SDK
   */
  async withdrawMfaFactor(uid: string, mfaEnrollmentId: string, tenantId?: string): Promise<void> {
    try {
      const authInstance = tenantId ? this.auth.tenantManager().authForTenant(tenantId) : this.auth;

      // Use Admin SDK to remove all MFA factors by setting enrolledFactors to empty array
      await authInstance.updateUser(uid, {
        multiFactor: {
          enrolledFactors: []
        }
      });
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Withdraw MFA factor (legacy method for client-side withdrawal)
   */
  async withdraw(idToken: string, mfaEnrollmentId?: string, tenantId?: string): Promise<void> {
    try {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new Error('Firebase API key not configured');
      }

      const url = `https://identitytoolkit.googleapis.com/v1/accounts:withdrawMfa?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
          mfaEnrollmentId: mfaEnrollmentId,
          ...(tenantId ? { tenantId } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'MFA withdrawal failed');
      }
    } catch (error: unknown) {
      throw this.handleFirebaseError(error);
    }
  }
}
