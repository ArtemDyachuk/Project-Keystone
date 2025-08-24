import { Controller, Post, Body, HttpException, HttpStatus, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { FirebaseServerClient, EmailLinkSignUpParams } from '@keystone/auth';
import { EmailService } from '../services/email.service';
import { SessionService } from '../services/session.service';
import { CSRFService } from '../services/csrf.service';
import { InviteService } from '../services/invite.service';
import { TenantService } from '../services/tenant.service';
import { SignupService } from '../services/signup.service';

// DTOs for request validation
export class SignupWithEmailLinkDto {
  firstName!: string;
  lastName!: string;
  email!: string;
  companyName!: string;
}

export class InitiateSignupDto {
  email!: string;
  companyName!: string;
  firstName!: string;
  lastName!: string;
}

export class VerifySignupTokenDto {
  token!: string;
}



export class CompleteInviteDto {
  token!: string;
  password!: string;
}

export class VerifyEmailDto {
  uid!: string;
  tenantId!: string;
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
}

@Controller('auth')
export class AuthController {
  private readonly firebaseClient: FirebaseServerClient;

  constructor(
    private readonly emailService: EmailService,
    private readonly tenantService: TenantService,
    private readonly inviteService: InviteService,
    private readonly signupService: SignupService,
    private readonly sessionService: SessionService,
    private readonly csrfService: CSRFService,
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

      if (!signupDto.companyName?.trim()) {
        throw new HttpException('Company name is required', HttpStatus.BAD_REQUEST);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(signupDto.email)) {
        throw new HttpException('Please enter a valid email address', HttpStatus.BAD_REQUEST);
      }

      // Use the new unified SignupService instead of old logic
      await this.signupService.initiateSignup({
        email: signupDto.email.trim().toLowerCase(),
        companyName: signupDto.companyName.trim(),
        firstName: signupDto.firstName.trim(),
        lastName: signupDto.lastName.trim(),
      });

      return {
        success: true,
        message: 'Signup verification email sent! Please check your email and click the verification link.',
        data: {
          email: signupDto.email.trim().toLowerCase(),
          companyName: signupDto.companyName.trim(),
          expiresAt: new Date(Date.now() + (15 * 60 * 1000)).toISOString(), // 15 minutes from now
        }
      };
    } catch (error) {
      console.error('❌ Signup with email link failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to start signup process. Please try again.',
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

      // Get user record from Firebase to verify user exists
      try {
        if (setPasswordDto.tenantId) {
          // User is in a GIP tenant - verify user exists
          await this.firebaseClient.getUserByUid(setPasswordDto.uid, setPasswordDto.tenantId);
        } else {
          // No tenant ID provided - this should not happen anymore
          throw new HttpException('Tenant ID is required for password setting', HttpStatus.BAD_REQUEST);
        }
      } catch (error: any) {
        if (error?.code === 'auth/user-not-found') {
          throw new HttpException('User not found. The invite may have expired or been cancelled.', HttpStatus.NOT_FOUND);
        }
        throw error;
      }

      // Regular password setting (existing flow)
      if (!setPasswordDto.tenantId) {
        throw new HttpException('Tenant ID is required for password setting', HttpStatus.BAD_REQUEST);
      }

      // Set the password first
      await this.firebaseClient.setUserPassword(
        setPasswordDto.uid,
        setPasswordDto.password,
        setPasswordDto.tenantId
      );

      // Enable the user and mark email as verified after password is set
      const enabledUser = await this.firebaseClient.updateUser(
        setPasswordDto.uid,
        { disabled: false, emailVerified: true },
        setPasswordDto.tenantId
      );

      return {
        success: true,
        message: 'Password set successfully! Your account is now ready.',
        user: {
          uid: enabledUser.uid,
          email: enabledUser.email,
          displayName: enabledUser.displayName,
          emailVerified: enabledUser.emailVerified,
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

      // Find the user's tenant automatically (similar to login method)
      let user: any = null;
      let gipTenantId: string | null = null;
      
      // Get all tenants from the database to search for the user
      const { Tenant } = await import('@keystone/database');
      const tenants = await Tenant.find({});
      
      // Search for the user in each GIP tenant
      for (const tenant of tenants) {
        if (tenant.gipTenantId) {
          try {
            const foundUser = await this.firebaseClient.getUserByEmail(email, tenant.gipTenantId);
            if (foundUser) {
              user = foundUser;
              gipTenantId = tenant.gipTenantId;
              break;
            }
          } catch {
            // User not found in this tenant, continue searching
            continue;
          }
        }
      }

      if (!user || !gipTenantId) {
        // For security, don't reveal if user exists or not
        return {
          success: true,
          message: 'If an account with that email exists, we\'ve sent a password reset link.',
          emailSent: true
        };
      }

      // Generate password reset link
      let resetLink: string;

      if (process.env.NODE_ENV === 'development') {
        // For development, generate a simple reset link
        const resetCode = Math.random().toString(36).substring(2, 15);
        resetLink = `${process.env.FRONTEND_CMS_URL}/auth/reset-password?oobCode=${resetCode}&mode=resetPassword&email=${encodeURIComponent(email)}&tenantId=${gipTenantId}`;
      } else {
        // Production: use Firebase's password reset link
        const actionCodeSettings = {
          url: `${process.env.FRONTEND_CMS_URL}/auth/reset-password`,
          handleCodeInApp: false,
        };
        resetLink = await this.firebaseClient.generatePasswordResetLink(email, actionCodeSettings, gipTenantId);
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

      // Find the user's tenant automatically (similar to login method)
      let user: any = null;
      let gipTenantId: string | null = null;
      
      // Get all tenants from the database to search for the user
      const { Tenant } = await import('@keystone/database');
      const tenants = await Tenant.find({});
      
      // Search for the user in each GIP tenant
      for (const tenant of tenants) {
        if (tenant.gipTenantId) {
          try {
            const foundUser = await this.firebaseClient.getUserByEmail(email, tenant.gipTenantId);
            if (foundUser) {
              user = foundUser;
              gipTenantId = tenant.gipTenantId;
              break;
            }
          } catch {
            // User not found in this tenant, continue searching
            continue;
          }
        }
      }

      if (!user || !gipTenantId) {
        throw new HttpException(
          'No account found with this email address',
          HttpStatus.NOT_FOUND
        );
      }

      // Set the new password using the user's UID and GIP tenant ID
      await this.firebaseClient.setUserPassword(
        user.uid,
        resetDto.password,
        gipTenantId
      );

      // Enable the user after password reset
      const enabledUser = await this.firebaseClient.updateUser(
        user.uid,
        { disabled: false },
        gipTenantId
      );

      return {
        success: true,
        message: 'Password reset successfully! You can now sign in with your new password.',
        user: {
          uid: enabledUser.uid,
          email: enabledUser.email,
          displayName: enabledUser.displayName,
          emailVerified: enabledUser.emailVerified,
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

      // Step 1: Find the user by email in Firebase to get their UID
      // We need to search across all GIP tenants since we don't know which one they belong to
      let user: any = null;
      let gipTenantId: string | null = null;
      
      // Get all tenants from the database to search for the user
      const { Tenant } = await import('@keystone/database');
      const tenants = await Tenant.find({});
      
      // Search for the user in each GIP tenant
      for (const tenant of tenants) {
        if (tenant.gipTenantId) {
          try {
            const foundUser = await this.firebaseClient.getUserByEmail(email, tenant.gipTenantId);
            if (foundUser) {
              user = foundUser;
              gipTenantId = tenant.gipTenantId;
              break;
            }
          } catch {
            // User not found in this tenant, continue searching
            continue;
          }
        }
      }

      if (!user || !gipTenantId) {
        throw new HttpException(
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED
        );
      }

      // Step 2: Verify the password using the correct GIP tenant
      const verifiedUser = await this.firebaseClient.verifyUserCredentials(
        email,
        loginDto.password,
        gipTenantId
      );

      // Check if email is verified
      if (!verifiedUser.emailVerified) {
        throw new HttpException(
          'Please verify your email before signing in',
          HttpStatus.FORBIDDEN
        );
      }

      // Step 3: Get user's tenant and corporation information
      let selectedCorporationId: string | null = null;
      let userRoles: string[] = [];
      let userTenantId: string | null = null;

      try {
        const { TenantMembership, Corporation } = await import('@keystone/database');
        
        // Find the tenant record that matches the GIP tenant ID
        const tenantRecord = await Tenant.findOne({ gipTenantId: gipTenantId });
        if (!tenantRecord) {
          throw new Error('Tenant record not found');
        }

        // Get the user's membership
        const userMembership = await TenantMembership.findOne({
          userId: verifiedUser.uid,
          tenantId: tenantRecord._id,
          isActive: true
        });

        if (userMembership) {
          userTenantId = tenantRecord._id.toString();
          userRoles = userMembership.roles || [];

          const corporation = await Corporation.findOne({ tenantId: tenantRecord._id });
          if (corporation) {
            selectedCorporationId = corporation._id.toString();
          }
        }
      } catch (error) {
        console.log('Could not determine corporation or roles, will set to null/empty:', error);
      }

      // Create session
      const sessionId = await this.sessionService.createSession({
        uid: user.uid,
        email: user.email || email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        tenantId: userTenantId,
        selectedCorporationId: selectedCorporationId,
        roles: userRoles,
      });

      // Generate CSRF token for this session
      const csrfToken = await this.csrfService.generateToken(sessionId);

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
  async getSession(@Req() request: Request & { cookies?: Record<string, string> }) {
    try {
      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (!sessionId) {
        return {
          success: false,
          message: 'No active session'
        };
      }

      const sessionData = await this.sessionService.getSession(sessionId);

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
  async logout(@Req() request: Request & { cookies?: Record<string, string> }) {
    try {
      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (sessionId) {
        // Delete the session from storage
        const deleted = await this.sessionService.deleteSession(sessionId);
        // Delete the CSRF token for this session
        await this.csrfService.deleteToken(sessionId);
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
      const sessionCounts = await this.sessionService.getSessionCount();
      // Don't expose actual session IDs for security
      return {
        success: true,
        sessionCounts,
        message: `Currently ${sessionCounts.total} active sessions (Redis: ${sessionCounts.redis}, Memory: ${sessionCounts.memory})`
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
  async getCSRFToken(@Req() request: Request & { cookies?: Record<string, string> }) {
    try {
      // Get sessionId from HttpOnly cookie
      const sessionId = request.cookies?.session;

      if (!sessionId) {
        throw new HttpException('Authentication required', HttpStatus.UNAUTHORIZED);
      }

      // Validate session exists
      const sessionData = await this.sessionService.getSession(sessionId);
      if (!sessionData) {
        throw new HttpException('Invalid session', HttpStatus.UNAUTHORIZED);
      }

      // Generate CSRF token for this session
      const csrfToken = await this.csrfService.generateToken(sessionId);

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

  /**
   * Initiate signup process with email verification
   * POST /auth/initiate-signup
   */
  @Post('initiate-signup')
  async initiateSignup(@Body() initiateDto: InitiateSignupDto) {
    try {
      // Validate input
      if (!initiateDto.email?.trim()) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      if (!initiateDto.companyName?.trim()) {
        throw new HttpException('Company name is required', HttpStatus.BAD_REQUEST);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(initiateDto.email)) {
        throw new HttpException('Please enter a valid email address', HttpStatus.BAD_REQUEST);
      }

      // Check if user already exists
      try {
        // Search all tenants for existing user
        const { Tenant } = await import('@keystone/database');
        const tenants = await Tenant.find({ gipTenantId: { $exists: true } });
        
        for (const tenant of tenants) {
          if (tenant.gipTenantId) {
            try {
              const existingUser = await this.firebaseClient.getUserByEmail(initiateDto.email, tenant.gipTenantId);
              if (existingUser) {
                throw new HttpException(
                  'An account with this email already exists',
                  HttpStatus.CONFLICT
                );
              }
            } catch (e: any) {
              if (e?.code !== 'auth/user-not-found') {
                throw e;
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof HttpException) {
          throw error;
        }
        // Continue if no existing user found
      }

      // Initiate signup verification
      await this.signupService.initiateSignup({
        email: initiateDto.email.trim().toLowerCase(),
        companyName: initiateDto.companyName.trim(),
        firstName: initiateDto.firstName.trim(),
        lastName: initiateDto.lastName.trim(),
      });

      return {
        success: true,
        message: 'Verification email sent! Please check your inbox and spam folder.',
        emailSent: true
      };
    } catch (error) {
      console.error('❌ Initiate signup failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to initiate signup. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify signup token and auto-create tenant/user
   * POST /auth/verify-signup-token
   */
  @Post('verify-signup-token')
  async verifySignupToken(@Body() verifyDto: VerifySignupTokenDto) {
    try {
      if (!verifyDto.token?.trim()) {
        throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
      }

      // Verify the token
      const verificationData = await this.signupService.verifyToken(verifyDto.token);

      if (verificationData.type !== 'signup') {
        throw new HttpException('Invalid token type', HttpStatus.BAD_REQUEST);
      }

      // Auto-create tenant and user
      const createTenantRequest = {
        name: verificationData.companyName!,
        userId: "temp", // Will be updated after user creation
        userEmail: verificationData.email,
      };

      const tenantResult = await this.tenantService.createTenant(createTenantRequest);
      if (!tenantResult.success) {
        throw new HttpException(`Failed to create tenant: ${tenantResult.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const tenantId = tenantResult.tenantId;
      
      // Get the GIP tenant ID
      const { Tenant } = await import('@keystone/database');
      const tenantRecord = await Tenant.findById(tenantId);
      if (!tenantRecord?.gipTenantId) {
        throw new HttpException('Failed to get GIP tenant ID', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      const gipTenantId = tenantRecord.gipTenantId;

      // Create user in the GIP tenant
      const params: EmailLinkSignUpParams = {
        email: verificationData.email,
        firstName: verificationData.firstName!,
        lastName: verificationData.lastName!,
        tenantId: gipTenantId,
      };

      const userRecord = await this.firebaseClient.createUserWithoutPassword(params);

      // Update TenantMembership with real user ID
      const { TenantMembership } = await import('@keystone/database');
      await TenantMembership.findOneAndUpdate(
        { userId: "temp" },
        { userId: userRecord.uid },
        { new: true }
      );

      // Delete the verification record
      await this.signupService.deleteVerification(verifyDto.token);

      return {
        success: true,
        message: 'Account created successfully! Please set your password.',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        },
        tenantId: tenantId,
        gipTenantId: gipTenantId,
        readyForPassword: true
      };
    } catch (error) {
      console.error('❌ Verify signup token failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to verify token. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }



  /**
   * Verify invite token
   * POST /auth/verify-invite-token
   */
  @Post('verify-invite-token')
  async verifyInviteToken(@Body() verifyDto: VerifySignupTokenDto) {
    try {
      if (!verifyDto.token?.trim()) {
        throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
      }

      // Verify the token
      const verificationData = await this.signupService.verifyToken(verifyDto.token);

      if (verificationData.type !== 'invite') {
        throw new HttpException('Invalid token type - expected invite', HttpStatus.BAD_REQUEST);
      }

      return {
        success: true,
        message: 'Invite token verified successfully! Please set your password.',
        email: verificationData.email,
        firstName: verificationData.firstName,
        lastName: verificationData.lastName,
        roles: verificationData.roles,
        token: verifyDto.token,
      };
    } catch (error) {
      console.error('❌ Verify invite token failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to verify token. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Complete invite acceptance by setting password
   * POST /auth/complete-invite
   */
  @Post('complete-invite')
  async completeInvite(@Body() completeDto: CompleteInviteDto) {
    try {
      if (!completeDto.token?.trim()) {
        throw new HttpException('Token is required', HttpStatus.BAD_REQUEST);
      }

      if (!completeDto.password?.trim()) {
        throw new HttpException('Password is required', HttpStatus.BAD_REQUEST);
      }

      if (completeDto.password.length < 8) {
        throw new HttpException('Password must be at least 8 characters long', HttpStatus.BAD_REQUEST);
      }

      // Password strength validation
      const hasUpperCase = /[A-Z]/.test(completeDto.password);
      const hasLowerCase = /[a-z]/.test(completeDto.password);
      const hasNumbers = /\d/.test(completeDto.password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(completeDto.password);

      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        throw new HttpException(
          'Password must contain uppercase, lowercase, numbers, and special characters',
          HttpStatus.BAD_REQUEST
        );
      }

      // Complete the invite using the InviteService
      await this.inviteService.acceptInvite(completeDto.token, completeDto.password);

      return {
        success: true,
        message: 'Invite accepted successfully! Your account is now active.',
        inviteCompleted: true
      };
    } catch (error) {
      console.error('❌ Complete invite failed:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to complete invite. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
