import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signOut,
  updateProfile,
  updatePassword,
  sendEmailVerification,
  User,
  UserCredential,
  Auth
} from "firebase/auth";
import { getFirebaseAuth } from "./config";

export interface FirebaseAuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface ResetPasswordParams {
  email: string;
}

export interface ConfirmResetPasswordParams {
  oobCode: string;
  newPassword: string;
}

export class FirebaseAuthClient {
  private auth: Auth;

  constructor() {
    this.auth = getFirebaseAuth();
  }

  /**
   * Sign up a new user with email and password
   */
  async signUp(params: SignUpParams): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        params.email,
        params.password
      );

      // Update user profile with display name
      await updateProfile(userCredential.user, {
        displayName: `${params.firstName} ${params.lastName}`.trim(),
      });

      // Send email verification
      await sendEmailVerification(userCredential.user);

      return userCredential;
    } catch (error) {
      throw new Error(`Sign up failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Sign in user with email and password
   */
  async signIn(params: SignInParams): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        params.email,
        params.password
      );

      return userCredential;
    } catch (error) {
      throw new Error(`Sign in failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get Firebase Auth tokens for a user
   */
  async getTokens(user: User): Promise<FirebaseAuthTokens> {
    try {
      const idToken = await user.getIdToken();
      const idTokenResult = await user.getIdTokenResult();
      
      return {
        accessToken: idToken, // Firebase uses ID token as access token
        idToken: idToken,
        refreshToken: user.refreshToken,
        expiresIn: Math.floor((new Date(idTokenResult.expirationTime).getTime() - Date.now()) / 1000),
      };
    } catch (error) {
      throw new Error(`Failed to get tokens: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Refresh user tokens
   */
  async refreshTokens(): Promise<FirebaseAuthTokens | null> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        return null;
      }

      // Force token refresh
      const idToken = await user.getIdToken(true);
      const idTokenResult = await user.getIdTokenResult();

      return {
        accessToken: idToken,
        idToken: idToken,
        refreshToken: user.refreshToken,
        expiresIn: Math.floor((new Date(idTokenResult.expirationTime).getTime() - Date.now()) / 1000),
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Send password reset email
   */
  async forgotPassword(params: ResetPasswordParams): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, params.email);
    } catch (error) {
      throw new Error(`Password reset failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Confirm password reset with code
   */
  async confirmPasswordReset(params: ConfirmResetPasswordParams): Promise<void> {
    try {
      await confirmPasswordReset(this.auth, params.oobCode, params.newPassword);
    } catch (error) {
      throw new Error(`Password reset confirmation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error("No authenticated user");
      }

      await updatePassword(user, newPassword);
    } catch (error) {
      throw new Error(`Password update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw new Error(`Sign out failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Wait for auth state to be determined
   */
  async waitForAuthState(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = this.auth.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  /**
   * Resend email verification
   */
  async resendVerificationEmail(): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        throw new Error("No authenticated user");
      }

      await sendEmailVerification(user);
    } catch (error) {
      throw new Error(`Failed to resend verification email: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Check if user's email is verified
   */
  isEmailVerified(): boolean {
    const user = this.auth.currentUser;
    return user?.emailVerified || false;
  }

  /**
   * Get user's display name
   */
  getDisplayName(): string | null {
    const user = this.auth.currentUser;
    return user?.displayName || null;
  }

  /**
   * Get user's email
   */
  getEmail(): string | null {
    const user = this.auth.currentUser;
    return user?.email || null;
  }
}

/**
 * Factory function to create Firebase Auth client
 */
export function createFirebaseAuthClient(): FirebaseAuthClient {
  return new FirebaseAuthClient();
}
