import { Controller, Post, Body, HttpException, HttpStatus, Get, Req } from '@nestjs/common';
import { FirebaseServerClient, EmailLinkSignUpParams, ActionCodeSettings } from '@keystone/auth';
import { EmailService } from '../services/email.service';
import { SessionService } from '../services/session.service';
import { CSRFService } from '../services/csrf.service';

// DTOs for request validation
export class SignupWithEmailLinkDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  tenantId?: string;
}

export class VerifyEmailDto {
  uid!: string;
  tenantId?: string;
}

export class SetPasswordDto {
  uid!: string;
  password!: string;
  tenantId?: string;
}



export class ForgotPasswordDto {
  email!: string;
  tenantId?: string;
}

export class ResetPasswordDto {
  email!: string;
  password!: string;
  oobCode!: string;
  tenantId?: string;
}

export class LoginDto {
  email!: string;
  password!: string;
  tenantId?: string;
}

@Controller('auth')
export class AuthController {
  private readonly firebaseClient: FirebaseServerClient;

  constructor(
    private readonly emailService: EmailService,
    private readonly sessionService: SessionService,
    private readonly csrfService: CSRFService
  ) {
    this.firebaseClient = new FirebaseServerClient();
  }

  /**
   * Start signup process with email verification link
   * POST /auth/signup-email-link
   */
  @Post('signup-email-link')
  async signupWithEmailLink(@Body() signupDto: SignupWithEmailLinkDto) {
    try {
      // Validate input
      if (!signupDto.firstName?.trim()) {
        throw new HttpException('First name is required', HttpStatus.BAD_REQUEST);
      }

      if (!signupDto.lastName?.trim()) {
        throw new HttpException('Last name is required', HttpStatus.BAD_REQUEST);
      }

      if (!signupDto.email?.trim()) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(signupDto.email)) {
        throw new HttpException('Please enter a valid email address', HttpStatus.BAD_REQUEST);
      }

      // Configure action code settings for email verification
      // For development, use a simple URL that Firebase will accept
      const actionCodeSettings: ActionCodeSettings = {
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email`,
        handleCodeInApp: false, // Set to false to avoid domain validation issues
      };

      const params: EmailLinkSignUpParams = {
        email: signupDto.email.trim().toLowerCase(),
        firstName: signupDto.firstName.trim(),
        lastName: signupDto.lastName.trim(),
        tenantId: signupDto.tenantId,
      };

      // Create user if missing, otherwise reuse existing user
      let userUid: string;
      try {
        const existing = await this.firebaseClient.getUserByEmail(params.email, params.tenantId);
        userUid = existing.uid;
      } catch (e: any) {
        if (e?.code === 'auth/user-not-found') {
          const created = await this.firebaseClient.createUserWithoutPassword(params);
          userUid = created.uid;
        } else {
          throw e;
        }
      }

      // For development, generate a simple verification link
      // In production, use Firebase's generateEmailVerificationLink
      let emailLink: string;

      if (process.env.NODE_ENV === 'development') {
        // Simple development verification link
        const verificationCode = Math.random().toString(36).substring(2, 15);
        emailLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify-email?oobCode=${verificationCode}&mode=verifyEmail&email=${encodeURIComponent(params.email)}&uid=${userUid}`;
        console.log('🔗 Development verification link:', emailLink);
      } else {
        // Production: use Firebase's email verification link
        emailLink = await this.firebaseClient.generateEmailVerificationLink(
          params.email,
          actionCodeSettings,
          params.tenantId
        );
      }

      // Send email via Resend (or log in dev)
      await this.emailService.sendEmail({
        to: params.email,
        subject: 'Verify your email',
        html: `
          <p>Hi ${params.firstName},</p>
          <p>Click the button below to verify your email and finish setting up your account.</p>
          <p><a href="${emailLink}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Verify Email</a></p>
          <p>Or copy and paste this link:</p>
          <p><a href="${emailLink}">${emailLink}</a></p>
        `,
      });

      return {
        success: true,
        message: 'Verification email sent! Please check your inbox and spam folder.',
        user: { uid: userUid },
        // Don't send the actual email link in the response for security
        emailSent: true
      };
    } catch (error) {
      console.error('❌ Signup with email link failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Firebase-specific errors with better error messages
      if (error instanceof Error) {
        const errorMessage = error.message;

        if (errorMessage.includes('email-already-exists')) {
          throw new HttpException(
            'An account already exists with this email address',
            HttpStatus.CONFLICT
          );
        }

        if (errorMessage.includes('unauthorized-continue-uri')) {
          throw new HttpException(
            'Invalid redirect URL configuration. Please check Firebase settings.',
            HttpStatus.BAD_REQUEST
          );
        }

        if (errorMessage.includes('invalid-email')) {
          throw new HttpException(
            'Please enter a valid email address',
            HttpStatus.BAD_REQUEST
          );
        }

        if (errorMessage.includes('weak-password')) {
          throw new HttpException(
            'Password is too weak. Please choose a stronger password.',
            HttpStatus.BAD_REQUEST
          );
        }

        // Log the specific Firebase error for debugging
        console.error('Firebase error details:', {
          code: (error as any).code,
          message: errorMessage,
          fullError: error,
          errorType: error.constructor.name
        });

        throw new HttpException(
          `Firebase authentication error: ${errorMessage}`,
          HttpStatus.BAD_REQUEST
        );
      }

      throw new HttpException(
        `Failed to start signup process: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify email after user clicks the verification link
   * POST /auth/verify-email
   */
  @Post('verify-email')
  async verifyEmail(@Body() verifyDto: VerifyEmailDto) {
    try {
      if (!verifyDto.uid) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const user = await this.firebaseClient.verifyEmailAndEnablePasswordSetup(
        verifyDto.uid,
        verifyDto.tenantId
      );

      return {
        success: true,
        message: 'Email verified successfully! You can now set your password.',
        user
      };
    } catch (error) {
      console.error('❌ Email verification failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to verify email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Set password after email verification
   * POST /auth/set-password
   */
  @Post('set-password')
  async setPassword(@Body() setPasswordDto: SetPasswordDto) {
    try {
      if (!setPasswordDto.uid) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!setPasswordDto.password) {
        throw new HttpException('Password is required', HttpStatus.BAD_REQUEST);
      }

      if (setPasswordDto.password.length < 8) {
        throw new HttpException('Password must be at least 8 characters long', HttpStatus.BAD_REQUEST);
      }

      // Password strength validation
      const hasUpperCase = /[A-Z]/.test(setPasswordDto.password);
      const hasLowerCase = /[a-z]/.test(setPasswordDto.password);
      const hasNumbers = /\d/.test(setPasswordDto.password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(setPasswordDto.password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new HttpException(
          'Password must contain uppercase, lowercase, numbers, and special characters',
          HttpStatus.BAD_REQUEST
        );
      }

      const user = await this.firebaseClient.setUserPassword(
        setPasswordDto.uid,
        setPasswordDto.password,
        setPasswordDto.tenantId
      );

      return {
        success: true,
        message: 'Password set successfully! Your account is now ready.',
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
        }
      };
    } catch (error) {
      console.error('❌ Set password failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Failed to set password: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }



  /**
   * Send password reset email
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    try {
      if (!forgotPasswordDto.email?.trim()) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(forgotPasswordDto.email)) {
        throw new HttpException('Please enter a valid email address', HttpStatus.BAD_REQUEST);
      }

      const email = forgotPasswordDto.email.trim().toLowerCase();

      // Check if user exists first
      try {
        await this.firebaseClient.getUserByEmail(email, forgotPasswordDto.tenantId);
      } catch (error: any) {
        if (error?.code === 'auth/user-not-found') {
          // For security, don't reveal if user exists or not
          return {
            success: true,
            message: 'If an account with that email exists, we\'ve sent a password reset link.',
            emailSent: true
          };
        }
        throw error;
      }

      // Generate password reset link
      let resetLink: string;

      if (process.env.NODE_ENV === 'development') {
        // For development, generate a simple reset link
        const resetCode = Math.random().toString(36).substring(2, 15);
        resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?oobCode=${resetCode}&mode=resetPassword&email=${encodeURIComponent(email)}`;
      } else {
        // Production: use Firebase's password reset link
        const actionCodeSettings = {
          url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password`,
          handleCodeInApp: false,
        };
        resetLink = await this.firebaseClient.generatePasswordResetLink(email, actionCodeSettings, forgotPasswordDto.tenantId);
      }

      // Send email via Resend (or log in dev)
      await this.emailService.sendEmail({
        to: email,
        subject: 'Reset your password',
        html: `
          <p>Hi there,</p>
          <p>You requested to reset your password for your Keystone CMS account.</p>
          <p>Click the button below to reset your password:</p>
          <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a></p>
          <p>Or copy and paste this link:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
        `,
      });

      return {
        success: true,
        message: 'Password reset email sent! Please check your inbox.',
        emailSent: true,
        // In development, include the reset link for testing
        ...(process.env.NODE_ENV === 'development' && { resetLink })
      };
    } catch (error) {
      console.error('❌ Forgot password failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Firebase-specific errors
      if (error instanceof Error) {
        const errorMessage = error.message;
        const errorCode = (error as any).code;

        if (errorCode === 'auth/user-not-found') {
          // For security, don't reveal if user exists or not
          return {
            success: true,
            message: 'If an account with that email exists, we\'ve sent a password reset link.',
            emailSent: true
          };
        }

        if (errorCode === 'auth/invalid-email') {
          throw new HttpException(
            'Please enter a valid email address',
            HttpStatus.BAD_REQUEST
          );
        }

        console.error('Password reset error details:', {
          code: errorCode,
          message: errorMessage,
          fullError: error
        });

        throw new HttpException(
          `Password reset failed: ${errorMessage}`,
          HttpStatus.BAD_REQUEST
        );
      }

      throw new HttpException(
        'Failed to send password reset email. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Reset password with verification code
   * POST /auth/reset-password
   */
  @Post('reset-password')
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    try {
      if (!resetDto.email?.trim()) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      if (!resetDto.password?.trim()) {
        throw new HttpException('Password is required', HttpStatus.BAD_REQUEST);
      }

      if (!resetDto.oobCode?.trim()) {
        throw new HttpException('Reset code is required', HttpStatus.BAD_REQUEST);
      }

      // Password validation
      if (resetDto.password.length < 8) {
        throw new HttpException('Password must be at least 8 characters long', HttpStatus.BAD_REQUEST);
      }

      const hasUpperCase = /[A-Z]/.test(resetDto.password);
      const hasLowerCase = /[a-z]/.test(resetDto.password);
      const hasNumbers = /\d/.test(resetDto.password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(resetDto.password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new HttpException(
          'Password must contain uppercase, lowercase, numbers, and special characters',
          HttpStatus.BAD_REQUEST
        );
      }

      const email = resetDto.email.trim().toLowerCase();

      // Get user by email to get the UID
      const user = await this.firebaseClient.getUserByEmail(email, resetDto.tenantId);

      // Set the new password using the user's UID
      const updatedUser = await this.firebaseClient.setUserPassword(
        user.uid,
        resetDto.password,
        resetDto.tenantId
      );

      return {
        success: true,
        message: 'Password reset successfully! You can now sign in with your new password.',
        user: {
          uid: updatedUser.uid,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          emailVerified: updatedUser.emailVerified,
        }
      };
    } catch (error) {
      console.error('❌ Reset password failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Firebase-specific errors
      if (error instanceof Error) {
        const errorMessage = error.message;
        const errorCode = (error as any).code;

        if (errorCode === 'auth/user-not-found') {
          throw new HttpException(
            'No account found with this email address',
            HttpStatus.NOT_FOUND
          );
        }

        if (errorCode === 'auth/invalid-email') {
          throw new HttpException(
            'Please enter a valid email address',
            HttpStatus.BAD_REQUEST
          );
        }

        if (errorCode === 'auth/weak-password') {
          throw new HttpException(
            'Password is too weak. Please choose a stronger password.',
            HttpStatus.BAD_REQUEST
          );
        }

        console.error('Password reset error details:', {
          code: errorCode,
          message: errorMessage,
          fullError: error
        });

        throw new HttpException(
          `Password reset failed: ${errorMessage}`,
          HttpStatus.BAD_REQUEST
        );
      }

      throw new HttpException(
        'Failed to reset password. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Login with email and password
   * POST /auth/login
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      if (!loginDto.email?.trim()) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      if (!loginDto.password?.trim()) {
        throw new HttpException('Password is required', HttpStatus.BAD_REQUEST);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginDto.email)) {
        throw new HttpException('Please enter a valid email address', HttpStatus.BAD_REQUEST);
      }

      const email = loginDto.email.trim().toLowerCase();

      // Verify credentials with Firebase
      const user = await this.firebaseClient.verifyUserCredentials(
        email,
        loginDto.password,
        loginDto.tenantId
      );

      // Check if email is verified
      if (!user.emailVerified) {
        throw new HttpException(
          'Please verify your email before signing in',
          HttpStatus.FORBIDDEN
        );
      }

      // Create session
      const sessionId = this.sessionService.createSession({
        uid: user.uid,
        email: user.email || email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        tenantId: user.tenantId || null,
        roles: [], // Will be populated from database later
      });

      // Generate CSRF token for this session
      const csrfToken = this.csrfService.generateToken(sessionId);

      return {
        success: true,
        message: 'Login successful',
        sessionId, // Frontend will set this as HttpOnly cookie
        csrfToken, // Frontend will set this as readable cookie
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified,
        }
      };
    } catch (error) {
      console.error('❌ Login failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Firebase-specific errors
      if (error instanceof Error) {
        const errorMessage = error.message;
        const errorCode = (error as any).code;

        if (errorCode === 'auth/user-not-found') {
          throw new HttpException(
            'No account found with this email address',
            HttpStatus.UNAUTHORIZED
          );
        }

        if (errorCode === 'auth/invalid-email') {
          throw new HttpException(
            'Please enter a valid email address',
            HttpStatus.BAD_REQUEST
          );
        }

        if (errorCode === 'auth/user-disabled') {
          throw new HttpException(
            'This account has been disabled',
            HttpStatus.FORBIDDEN
          );
        }

        console.error('Login error details:', {
          code: errorCode,
          message: errorMessage,
          fullError: error
        });

        throw new HttpException(
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED
        );
      }

      throw new HttpException(
        'Login failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get current session
   * GET /auth/session
   */
  @Get('session')
  async getSession(@Req() request: any) {
    try {
      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (!sessionId) {
        return {
          success: false,
          message: 'No active session'
        };
      }

      const sessionData = this.sessionService.getSession(sessionId);

      if (!sessionData) {
        return {
          success: false,
          message: 'Session not found or expired'
        };
      }

      return {
        success: true,
        user: sessionData.user,
        sessionId: sessionData.sessionId
      };
    } catch (error) {
      console.error('❌ Get session failed:', error);

      return {
        success: false,
        message: 'Failed to get session'
      };
    }
  }

  /**
   * Logout - destroy session
   * POST /auth/logout
   */
  @Post('logout')
  async logout(@Req() request: any) {
    try {
      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (sessionId) {
        // Delete the session from storage
        const deleted = this.sessionService.deleteSession(sessionId);
        // Delete the CSRF token for this session
        this.csrfService.deleteToken(sessionId);
        console.log('🔄 Session and CSRF token deleted:', { sessionId, deleted });
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      console.error('❌ Logout failed:', error);

      return {
        success: true, // Always return success for logout
        message: 'Logged out'
      };
    }
  }

  /**
   * Debug: Get session count and IDs (development only)
   * GET /auth/debug/sessions
   */
  @Get('debug/sessions')
  async getSessionDebug() {
    if (process.env.NODE_ENV === 'production') {
      throw new HttpException('Not available in production', HttpStatus.FORBIDDEN);
    }

    try {
      const sessionCount = this.sessionService.getSessionCount();
      const sessionIds = this.sessionService.getAllSessionIds(); // We need to add this method
      return {
        success: true,
        sessionCount,
        sessionIds: sessionIds.map(id => id.substring(0, 8) + '...'), // Partial IDs for security
        message: `Currently ${sessionCount} active sessions`
      };
    } catch (error) {
      console.error('❌ Session debug failed:', error);
      return {
        success: false,
        message: 'Failed to get session debug info'
      };
    }
  }

  /**
   * Get CSRF token for authenticated session
   * GET /auth/csrf-token
   */
  @Get('csrf-token')
  async getCSRFToken(@Req() request: any) {
    try {
      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      // Validate session exists
      const sessionData = this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid session', HttpStatus.UNAUTHORIZED);
      }

      // Generate CSRF token for this session
      const csrfToken = this.csrfService.generateToken(sessionId);

      return {
        success: true,
        csrfToken
      };
    } catch (error) {
      console.error('❌ Get CSRF token failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to generate CSRF token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
