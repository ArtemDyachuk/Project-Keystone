import { Controller, Post, Body, HttpException, HttpStatus, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseServerClient, EmailLinkSignUpParams } from '@keystone/auth';
import { EmailService } from '../services/email.service';
import { SessionService } from '../services/session.service';
import { CSRFService } from '../services/csrf.service';
import { InviteService } from '../services/invite.service';
import { TenantService } from '../services/tenant.service';
import { SignupService } from '../services/signup.service';
import { Logger } from '@nestjs/common';
import { SessionGuard } from '../guards/session.guard';
import { StepUpGuard } from '../guards/step-up.guard';
import { RedisService } from '../services/redis.service';
import {
  SignupWithEmailLinkDto,
  LoginDto,
  MfaLoginDto,
  StepUpDto,
  VerifyEmailDto,
  SetPasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  InitiateSignupDto,
  VerifySignupTokenDto,
  CompleteInviteDto
} from '../dto/auth.dto';
import {
  StartMfaEnrollmentDto,
  FinishMfaEnrollmentDto,
  MfaEnrollmentStartResponse,
  MfaEnrollmentFinishResponse,
  MfaUnenrollmentResponse,
  MfaStatusResponse
} from '../dto/mfa.dto';

// DTOs are now imported from ../dto/auth.dto

@Controller('auth')
export class AuthController {
  private readonly firebaseClient: FirebaseServerClient;
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly tenantService: TenantService,
    private readonly inviteService: InviteService,
    private readonly signupService: SignupService,
    private readonly sessionService: SessionService,
    private readonly csrfService: CSRFService,
    private readonly redisService: RedisService,
  ) {
    this.firebaseClient = new FirebaseServerClient();
  }

  /**
   * Find user by email across all tenants (optimized for login)
   */
  private async findUserByEmailAcrossTenants(email: string, tenantIds: string[]): Promise<{ user: any; tenantId: string } | null> {
    try {
      // Search tenants in parallel for better performance
      const searchPromises = tenantIds.map(async (tenantId) => {
        try {
          const user = await this.firebaseClient.getUserByEmail(email, tenantId);
          return { user, tenantId };
        } catch {
          return null; // User not found in this tenant
        }
      });

      const results = await Promise.all(searchPromises);
      const found = results.find(result => result !== null);

      return found || null;
    } catch (error: unknown) {
      this.logger.error('Error finding user across tenants', error);
      return null;
    }
  }

  /**
   * Start signup process with email verification link
   * POST /auth/signup-email-link
   */
  @Post('signup-email-link')
  async signupWithEmailLink(@Body() signupDto: SignupWithEmailLinkDto) {
    // Validation is now handled by DTOs with class-validator
    // Error handling is now handled by global exception filter
    // Response formatting is now handled by response interceptor

    await this.signupService.initiateSignup({
      email: signupDto.email.trim().toLowerCase(),
      companyName: signupDto.companyName.trim(),
      firstName: signupDto.firstName.trim(),
      lastName: signupDto.lastName.trim(),
    });

    return {
      message: 'Signup verification email sent! Please check your email and click the verification link.',
      data: {
        email: signupDto.email.trim().toLowerCase(),
        companyName: signupDto.companyName.trim(),
        expiresAt: new Date(Date.now() + (15 * 60 * 1000)).toISOString(), // 15 minutes from now
      }
    };
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
      this.logger.error('Email verification failed', error);

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
  @UseGuards(SessionGuard, StepUpGuard)
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
      this.logger.error('Set password failed', error);

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
      this.logger.error('Forgot password failed', error);

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
      this.logger.error('Reset password failed', error);

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

      // Step 1: Find user's tenant using optimized parallel search
      const { Tenant } = await import('@keystone/database');
      const tenants = await Tenant.find({});
      const gipTenantIds = tenants
        .filter(tenant => tenant.gipTenantId)
        .map(tenant => tenant.gipTenantId!);

      if (gipTenantIds.length === 0) {
        throw new HttpException(
          'No tenants configured',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Use optimized parallel search across all tenants
      const userResult = await this.findUserByEmailAcrossTenants(email, gipTenantIds);

      if (!userResult) {
        throw new HttpException(
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED
        );
      }

      const { tenantId: gipTenantId } = userResult;

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

      // Step 2.5: Check if user has MFA enabled
      let mfaEnabled = false;
      let mfaEnrolledAt: number | undefined = undefined;

      try {
        this.logger.log(`Checking MFA status for user ${verifiedUser.uid} in tenant ${gipTenantId}`);

        // Get user's MFA factors from Firebase
        const mfaFactors = await this.firebaseClient.getMfaFactors(verifiedUser.uid, gipTenantId);
        this.logger.log(`MFA factors found: ${mfaFactors?.length || 0}`);

        mfaEnabled = mfaFactors && mfaFactors.length > 0;

        // If MFA is enabled, we need to get the enrollment timestamp
        if (mfaEnabled) {
          // For now, we'll use the current time as enrollment time
          // In a real implementation, you might want to store this in your database
          mfaEnrolledAt = Math.floor(Date.now() / 1000);
          this.logger.log(`MFA enabled for user ${verifiedUser.uid}, enrolled at ${mfaEnrolledAt}`);
          
          // If MFA is enabled, return a response indicating MFA is required
          // The frontend should then prompt for the MFA code and call the MFA login endpoint
          return {
            success: false,
            message: 'MFA verification required',
            mfaRequired: true,
            email: verifiedUser.email,
            mfa: {
              enabled: true,
              enrolledAt: mfaEnrolledAt
            }
          };
        }
      } catch (error) {
        // If MFA check fails, log but don't block login
        this.logger.warn(`Failed to check MFA status for user ${verifiedUser.uid}:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: error?.constructor?.name || 'Unknown'
        });
        mfaEnabled = false;
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

          // Check if user is disabled
          if (userMembership.disabled === true) {
            throw new HttpException(
              'This account has been disabled',
              HttpStatus.FORBIDDEN
            );
          }

          const corporation = await Corporation.findOne({ tenantId: tenantRecord._id });
          if (corporation) {
            selectedCorporationId = corporation._id.toString();
          }
        }
      } catch (error) {
        this.logger.warn('Could not determine corporation or roles, will set to null/empty', error);
      }

      // Create session with real MFA status
      const sessionId = await this.sessionService.createSession({
        uid: verifiedUser.uid,
        email: verifiedUser.email || email,
        displayName: verifiedUser.displayName,
        emailVerified: verifiedUser.emailVerified,
        tenantId: userTenantId,
        selectedCorporationId: selectedCorporationId,
        roles: userRoles,
        disabled: false, // User passed disabled check, so they are not disabled
        mfa: mfaEnabled, // Use real MFA status from Firebase
        authTime: Math.floor(Date.now() / 1000), // Current time as Unix timestamp
        mfaEnrolledAt: mfaEnrolledAt, // Real enrollment time from Firebase
      });

      // Generate CSRF token for this session
      const csrfToken = await this.csrfService.generateToken(sessionId);

      return {
        success: true,
        message: 'Login successful',
        sessionId, // Frontend will set this as HttpOnly cookie
        csrfToken, // Frontend will set this as readable cookie
        mfa: {
          enabled: mfaEnabled,
          enrolledAt: mfaEnrolledAt,
          required: mfaEnabled, // If MFA is enabled, it's required for sensitive operations
        },
        user: {
          uid: verifiedUser.uid,
          email: verifiedUser.email,
          displayName: verifiedUser.displayName,
          emailVerified: verifiedUser.emailVerified,
        }
      };
    } catch (error) {
      // Clean logging using NestJS logger
      if (error instanceof HttpException) {
        // For known HTTP exceptions, just log the message
        this.logger.error(`Login failed: ${error.message} (${error.getStatus()})`);
        throw error;
      }

      // For unexpected errors, log detailed info
      this.logger.error('Login failed - unexpected error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name || 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });

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
      // Clean logging using NestJS logger
      this.logger.warn(`Get session failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
        this.logger.debug('Session and CSRF token deleted', { sessionId, deleted });
      }

      return {
        success: true,
        message: 'Logged out successfully'
      };
    } catch (error) {
      this.logger.error('Logout failed', error);

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
      this.logger.error('Session debug failed', error);
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
      this.logger.error(`Get CSRF token failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
      this.logger.error(`Initiate signup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
      this.logger.error(`Verify signup token failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
      this.logger.error(`Verify invite token failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

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
   * Refresh access token using refresh token
   * POST /auth/refresh
   */
  @Post('refresh')
  async refreshToken(@Body() refreshDto: { refreshToken: string; email: string }) {
    try {
      if (!refreshDto.refreshToken?.trim()) {
        throw new HttpException('Refresh token is required', HttpStatus.BAD_REQUEST);
      }

      if (!refreshDto.email?.trim()) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      const email = refreshDto.email.trim().toLowerCase();

      // First, verify the refresh token and get user ID
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw new HttpException('Firebase API key not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshDto.refreshToken,
        })
      });

      if (!response.ok) {
        const error = await response.json() as { error?: { message?: string } };
        throw new HttpException(
          error.error?.message || 'Token refresh failed',
          HttpStatus.UNAUTHORIZED
        );
      }

      const tokenData = await response.json() as {
        user_id: string;
        access_token: string;
        id_token: string;
        refresh_token: string;
        expires_in: string;
      };
      const userId = tokenData.user_id;

      // Find user's tenant using optimized lookup
      const { TenantMembership } = await import('@keystone/database');
      const membership = await TenantMembership.findOne({
        userId: userId // Use the actual user ID from the token
      }).populate('tenantId');

      if (!membership || !membership.tenantId) {
        throw new HttpException('User not found in any tenant', HttpStatus.UNAUTHORIZED);
      }

      const tenant = membership.tenantId as any;
      if (!tenant.gipTenantId) {
        throw new HttpException('Tenant not properly configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Create new session with refreshed tokens
      const sessionId = await this.sessionService.createSession({
        uid: tokenData.user_id,
        email: email,
        displayName: null,
        emailVerified: true,
        tenantId: tenant.gipTenantId,
        selectedCorporationId: tenant._id.toString(),
        roles: membership.roles,
        disabled: false,
        mfa: false, // Default to false for new sessions
        authTime: Math.floor(Date.now() / 1000), // Current time as Unix timestamp
        mfaEnrolledAt: undefined, // Not enrolled yet
      });

      // Generate new CSRF token
      const csrfToken = await this.csrfService.generateToken(sessionId);

      return {
        success: true,
        accessToken: tokenData.access_token,
        idToken: tokenData.id_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: parseInt(tokenData.expires_in),
        sessionId,
        csrfToken,
      };
    } catch (error: unknown) {
      this.logger.error('Token refresh failed', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Token refresh failed. Please log in again.',
        HttpStatus.UNAUTHORIZED
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
      this.logger.error(`Complete invite failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to complete invite. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ========================================
  // MFA ENDPOINTS
  // ========================================

  /**
   * Start MFA enrollment process
   * POST /auth/mfa/totp/start
   */
  @Post('mfa/totp/start')
  @UseGuards(SessionGuard)
  async startMfaEnrollment(
    @Body() startDto: StartMfaEnrollmentDto,
    @Req() req: any
  ): Promise<MfaEnrollmentStartResponse> {
    try {
      const user = req.user;

      this.logger.log(`🔄 Starting MFA enrollment for user ${user.uid}`);

      // Get the Firebase GIP tenant ID from the database
      const { Tenant } = await import('@keystone/database');
      const tenantRecord = await Tenant.findById(user.tenantId);

      if (!tenantRecord?.gipTenantId) {
        throw new HttpException('Tenant not properly configured with Firebase GIP', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Re-authenticate user with email/password to get a valid first factor token
      this.logger.log(`Re-authenticating user ${user.uid} with email/password for MFA enrollment`);
      
      const reauthResult = await this.firebaseClient.verifyPasswordWithREST(
        user.email,
        startDto.password,
        tenantRecord.gipTenantId
      );

      if (!reauthResult.idToken) {
        throw new HttpException('Invalid password. Please enter your current password to enable MFA.', HttpStatus.UNAUTHORIZED);
      }

      this.logger.log(`✅ User re-authenticated successfully for MFA enrollment`);

      // Start MFA enrollment with Firebase using the re-authenticated token
      const enrollmentResponse = await this.firebaseClient.enrollStart(reauthResult.idToken, tenantRecord.gipTenantId);

      // Store session info in Redis for 5 minutes
      const enrollmentKey = `mfa:enroll:${user.uid}`;
      await this.redisService.set(
        enrollmentKey,
        JSON.stringify({
          sessionInfo: enrollmentResponse.sessionInfo,
          tenantId: tenantRecord.gipTenantId,
          uid: user.uid,
          // Persist the first-factor idToken obtained via email/password reauth
          firstFactorIdToken: reauthResult.idToken,
        }),
        300 // 5 minutes TTL
      );

      this.logger.log(`✅ MFA enrollment started for user ${user.uid}`);

      return {
        success: true,
        message: 'MFA enrollment started. Please scan the QR code with your authenticator app.',
        qrCodeUrl: enrollmentResponse.qrCodeUrl,
        otpauthUrl: enrollmentResponse.otpauthUrl,
        sessionInfo: enrollmentResponse.sessionInfo,
      };
    } catch (error) {
      this.logger.error(`❌ MFA enrollment start failed:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to start MFA enrollment. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Complete MFA enrollment with verification code
   * POST /auth/mfa/totp/finish
   */
  @Post('mfa/totp/finish')
  @UseGuards(SessionGuard)
  async finishMfaEnrollment(
    @Body() finishDto: FinishMfaEnrollmentDto,
    @Req() req: any
  ): Promise<MfaEnrollmentFinishResponse> {
    try {
      const user = req.user;
      const sessionId = req.sessionId;

      this.logger.log(`🔄 Completing MFA enrollment for user ${user.uid}`);

      // Get the Firebase GIP tenant ID from the database
      const { Tenant } = await import('@keystone/database');
      const tenantRecord = await Tenant.findById(user.tenantId);

      if (!tenantRecord?.gipTenantId) {
        throw new HttpException('Tenant not properly configured with Firebase GIP', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Get enrollment session info from Redis
      const enrollmentKey = `mfa:enroll:${user.uid}`;
      const enrollmentData = await this.redisService.get(enrollmentKey);

      if (!enrollmentData) {
        throw new HttpException(
          'MFA enrollment session expired. Please start enrollment again.',
          HttpStatus.BAD_REQUEST
        );
      }

      const { sessionInfo, firstFactorIdToken } = JSON.parse(enrollmentData);

      // Use the password reauth token (first factor) to finalize enrollment
      const finalizeIdToken = firstFactorIdToken || await this.getUserIdToken(user.uid, tenantRecord.gipTenantId);
      await this.firebaseClient.enrollFinish(
        finalizeIdToken,
        finishDto.verificationCode,
        sessionInfo,
        tenantRecord.gipTenantId
      );

      // Get fresh ID token from Firebase
      const idToken = await this.getUserIdToken(user.uid, tenantRecord.gipTenantId);
      const decodedToken = await this.firebaseClient.verifyIdToken(idToken, tenantRecord.gipTenantId);

      // Update session with MFA enabled
      const currentTime = Math.floor(Date.now() / 1000);
      await this.sessionService.updateMfaStatus(
        sessionId,
        true, // Enable MFA
        (decodedToken as any).auth_time || currentTime,
        currentTime // Enrollment time
      );

      // Clean up enrollment session
      await this.redisService.del(enrollmentKey);

      this.logger.log(`✅ MFA enrollment completed for user ${user.uid}`);

      return {
        success: true,
        message: 'MFA enrollment completed successfully.',
        mfaEnabled: true,
        mfaEnrolledAt: currentTime,
      };
    } catch (error) {
      this.logger.error(`❌ MFA enrollment finish failed:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Firebase MFA errors
      if ((error as Error).message?.includes('INVALID_OTP') || (error as Error).message?.includes('verification')) {
        throw new HttpException(
          { code: 'INVALID_OTP', message: 'Invalid verification code. Please try again.' },
          HttpStatus.BAD_REQUEST
        );
      }

      throw new HttpException(
        'Failed to complete MFA enrollment. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Remove MFA from user account
   * POST /auth/mfa/unenroll
   */
  @Post('mfa/unenroll')
  @UseGuards(SessionGuard)
  async unenrollMfa(@Req() req: any, @Body("password") password?: string): Promise<MfaUnenrollmentResponse> {
    try {
      const user = req.user;
      const sessionId = req.sessionId;

      this.logger.log(`🔄 Unenrolling MFA for user ${user.uid}`);

      // Resolve tenant and require password re-auth for secure withdrawal
      const { Tenant } = await import('@keystone/database');
      const tenantRecord = await Tenant.findById(user.tenantId);
      if (!tenantRecord?.gipTenantId) {
        throw new HttpException('Tenant not properly configured with Firebase GIP', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (!password || !user.email) {
        throw new HttpException('Password is required to remove MFA.', HttpStatus.BAD_REQUEST);
      }

      // Re-authenticate with email/password to obtain a valid first-factor token
      // Re-authenticate with email/password to obtain MFA info
      const reauth = await this.firebaseClient.verifyPasswordWithREST(
        user.email,
        password,
        tenantRecord.gipTenantId
      );
      
      // For MFA-enabled users, we get mfaPendingCredential instead of idToken
      if (!reauth?.mfaPendingCredential) {
        throw new HttpException('Invalid email or password.', HttpStatus.UNAUTHORIZED);
      }

      // For MFA unenrollment, we need to use Admin SDK since user has MFA enabled
      // The mfaPendingCredential indicates MFA is required, so we can't use it directly
      // Instead, we'll use the Admin SDK to remove all MFA factors directly
      
      // Use Admin SDK to remove all MFA factors (we don't need specific enrollment ID)
      await this.firebaseClient.withdrawMfaFactor(user.uid, '', tenantRecord.gipTenantId);

      // Update session with MFA disabled
      await this.sessionService.updateMfaStatus(
        sessionId,
        false, // Disable MFA
        user.authTime, // Keep existing auth time
        undefined // Clear enrollment time
      );

      this.logger.log(`✅ MFA unenrolled for user ${user.uid}`);

      return {
        success: true,
        message: 'MFA has been removed from your account.',
        mfaEnabled: false,
      };
    } catch (error) {
      this.logger.error(`❌ MFA unenrollment failed:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to remove MFA. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get current MFA status
   * GET /auth/mfa/status
   */
  @Get('mfa/status')
  @UseGuards(SessionGuard)
  async getMfaStatus(@Req() req: any): Promise<MfaStatusResponse> {
    try {
      const user = req.user;

      return {
        success: true,
        mfaEnabled: user.mfa || false,
        mfaEnrolledAt: user.mfaEnrolledAt,
        message: user.mfa ? 'MFA is enabled' : 'MFA is not enabled',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get MFA status:`, error);

      throw new HttpException(
        'Failed to get MFA status.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Enable MFA TOTP at project level (admin only)
   */
  @Post('mfa/enable-project')
  @UseGuards(SessionGuard)
  async enableMfaProject(@Req() req: any) {
    try {
      const user = req.user;
      if (!user) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      this.logger.log(`Enabling MFA TOTP at project level for user ${user.uid}`);

      // Check if MFA is already enabled
      const isEnabled = await this.firebaseClient.isMfaTotpEnabled();
      if (isEnabled) {
        return {
          success: true,
          message: 'MFA TOTP is already enabled at project level',
          alreadyEnabled: true
        };
      }

      // Enable MFA TOTP
      await this.firebaseClient.enableMfaTotp();

      return {
        success: true,
        message: 'MFA TOTP enabled successfully at project level',
        alreadyEnabled: false
      };
    } catch (error) {
      this.logger.error('❌ Failed to enable MFA at project level:', error);
      throw new HttpException('Failed to enable MFA at project level', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Enable MFA TOTP for current user's tenant
   */
  @Post('mfa/enable-tenant')
  @UseGuards(SessionGuard)
  async enableMfaTenant(@Req() req: any) {
    try {
      const user = req.user;
      if (!user) {
        throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);
      }

      this.logger.log(`Enabling MFA TOTP for tenant of user ${user.uid}`);

      // Get user's tenant information
      const { TenantMembership } = await import('@keystone/database');
      const membership = await TenantMembership.findOne({
        userId: user.uid,
        isActive: true
      });

      if (!membership) {
        throw new HttpException('User not found in any tenant', HttpStatus.NOT_FOUND);
      }

      const { Tenant } = await import('@keystone/database');
      const tenant = await Tenant.findById(membership.tenantId);
      if (!tenant) {
        throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);
      }

      // Enable MFA TOTP for this tenant
      await this.firebaseClient.enableMfaTotpForTenant(tenant.gipTenantId);

      return {
        success: true,
        message: `MFA TOTP enabled successfully for tenant ${tenant.name}`,
        tenantId: tenant.gipTenantId
      };
    } catch (error) {
      this.logger.error('❌ Failed to enable MFA for tenant:', error);
      throw new HttpException('Failed to enable MFA for tenant', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Login with MFA TOTP code
   * POST /auth/login/totp
   */
  @Post('login/totp')
  async loginWithMfa(@Body() loginDto: MfaLoginDto) {
    try {
      if (!loginDto.email?.trim()) {
        throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
      }

      if (!loginDto.password?.trim()) {
        throw new HttpException('Password is required', HttpStatus.BAD_REQUEST);
      }

      if (!loginDto.verificationCode?.trim()) {
        throw new HttpException('Verification code is required', HttpStatus.BAD_REQUEST);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(loginDto.email)) {
        throw new HttpException('Please enter a valid email address', HttpStatus.BAD_REQUEST);
      }

      const email = loginDto.email.trim().toLowerCase();

      // Step 1: Find user's tenant using optimized parallel search
      const { Tenant } = await import('@keystone/database');
      const tenants = await Tenant.find({});
      const gipTenantIds = tenants
        .filter(tenant => tenant.gipTenantId)
        .map(tenant => tenant.gipTenantId!);

      if (gipTenantIds.length === 0) {
        throw new HttpException(
          'No tenants configured',
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Use optimized parallel search across all tenants
      const userResult = await this.findUserByEmailAcrossTenants(email, gipTenantIds);

      if (!userResult) {
        throw new HttpException(
          'Invalid email or password',
          HttpStatus.UNAUTHORIZED
        );
      }

      const { tenantId: gipTenantId } = userResult;

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

      // Step 3: Verify MFA TOTP code
      try {
        this.logger.log(`Getting MFA pending credential for user ${verifiedUser.uid}`);
        
        // Get the mfaPendingCredential from password verification
        const reauth = await this.firebaseClient.verifyPasswordWithREST(
          email,
          loginDto.password,
          gipTenantId
        );

        this.logger.log(`Reauth response:`, {
          hasMfaPendingCredential: !!reauth?.mfaPendingCredential,
          hasIdToken: !!reauth?.idToken,
          mfaPendingCredentialLength: reauth?.mfaPendingCredential?.length || 0
        });

        if (!reauth?.mfaPendingCredential) {
          throw new HttpException(
            'MFA pending credential not found. Please try logging in again.',
            HttpStatus.BAD_REQUEST
          );
        }

        this.logger.log(`Verifying TOTP code: ${loginDto.verificationCode} with pending credential: ${reauth.mfaPendingCredential.substring(0, 20)}...`);

        // Verify the TOTP code with Firebase using the pending credential
        const mfaResponse = await this.firebaseClient.signInFinalize(
          reauth.mfaPendingCredential,
          loginDto.verificationCode,
          gipTenantId,
          verifiedUser.uid
        );

        this.logger.log(`MFA verification successful, got response:`, {
          hasIdToken: !!mfaResponse?.idToken,
          idTokenLength: mfaResponse?.idToken?.length || 0
        });

        // Update the ID token with the MFA-verified token
        const verifiedIdToken = mfaResponse.idToken;

        // Verify the final token to get user data
        await this.firebaseClient.verifyIdToken(verifiedIdToken, gipTenantId);

        // Continue with the rest of the login flow...
        // Step 4: Get user's tenant and corporation information
        let selectedCorporationId: string | null = null;
        let userRoles: string[] = [];
        let userTenantId: string | null = null;

        try {
          const { Tenant, TenantMembership, Corporation } = await import('@keystone/database');

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

            // Check if user is disabled
            if (userMembership.disabled === true) {
              throw new HttpException(
                'This account has been disabled',
                HttpStatus.FORBIDDEN
              );
            }

            const corporation = await Corporation.findOne({ tenantId: tenantRecord._id });
            if (corporation) {
              selectedCorporationId = corporation._id.toString();
            }
          }
        } catch (error) {
          this.logger.warn('Could not determine corporation or roles, will set to null/empty', error);
        }

        // Create session with MFA-verified status
        const sessionId = await this.sessionService.createSession({
          uid: verifiedUser.uid,
          email: verifiedUser.email || email,
          displayName: verifiedUser.displayName,
          emailVerified: verifiedUser.emailVerified,
          tenantId: userTenantId,
          selectedCorporationId: selectedCorporationId,
          roles: userRoles,
          disabled: false,
          mfa: true, // MFA is enabled and verified
          authTime: Math.floor(Date.now() / 1000),
          mfaEnrolledAt: Math.floor(Date.now() / 1000), // Current time as enrollment time
        });

        // Generate CSRF token for this session
        const csrfToken = await this.csrfService.generateToken(sessionId);

        return {
          success: true,
          message: 'MFA login successful',
          sessionId,
          csrfToken,
          mfa: {
            enabled: true,
            enrolledAt: Math.floor(Date.now() / 1000),
            required: true,
          },
          user: {
            uid: verifiedUser.uid,
            email: verifiedUser.email,
            displayName: verifiedUser.displayName,
            emailVerified: verifiedUser.emailVerified,
          }
        };

      } catch (mfaError) {
        this.logger.error(`MFA verification failed for user ${verifiedUser.uid}:`, mfaError);

        if ((mfaError as Error).message?.includes('INVALID_OTP') || (mfaError as Error).message?.includes('verification')) {
          throw new HttpException(
            { code: 'INVALID_OTP', message: 'Invalid verification code. Please try again.' },
            HttpStatus.BAD_REQUEST
          );
        }

        throw new HttpException(
          'MFA verification failed. Please try again.',
          HttpStatus.UNAUTHORIZED
        );
      }

    } catch (error) {
      this.logger.error(`❌ MFA login failed:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'MFA login failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Step-up authentication with MFA verification
   * POST /auth/step-up
   */
  @Post('step-up')
  @UseGuards(SessionGuard)
  async stepUpAuthentication(@Body() stepUpDto: StepUpDto, @Req() req: any) {
    try {
      const user = req.user;
      const sessionId = req.sessionId;

      this.logger.log(`🔄 Step-up authentication for user ${user.uid}`);

      if (!user.mfa) {
        throw new HttpException(
          'MFA is not enabled for this account',
          HttpStatus.FORBIDDEN
        );
      }

      if (!stepUpDto.verificationCode?.trim()) {
        throw new HttpException(
          'Verification code is required',
          HttpStatus.BAD_REQUEST
        );
      }

      // Get user's ID token for MFA verification
      const idToken = await this.getUserIdToken(user.uid, user.tenantId);

      // Verify the TOTP code with Firebase
      await this.firebaseClient.signInFinalize(
        idToken,
        stepUpDto.verificationCode,
        user.tenantId,
        user.uid
      );

      // Update session with fresh MFA verification
      const currentTime = Math.floor(Date.now() / 1000);
      await this.sessionService.updateMfaStatus(
        sessionId,
        true, // MFA is enabled
        currentTime, // Fresh auth time
        user.mfaEnrolledAt // Keep existing enrollment time
      );

      this.logger.log(`✅ Step-up authentication successful for user ${user.uid}`);

      return {
        success: true,
        message: 'Step-up authentication successful',
        mfa: {
          enabled: true,
          verified: true,
          verifiedAt: currentTime,
        }
      };

    } catch (error) {
      this.logger.error(`❌ Step-up authentication failed:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      // Handle Firebase MFA errors
      if ((error as Error).message?.includes('INVALID_OTP') || (error as Error).message?.includes('verification')) {
        throw new HttpException(
          { code: 'INVALID_OTP', message: 'Invalid verification code. Please try again.' },
          HttpStatus.BAD_REQUEST
        );
      }

      throw new HttpException(
        'Step-up authentication failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Helper method to get user's ID token for Firebase operations
   * This method creates a custom token that can be exchanged for an ID token
   */
  private async getUserIdToken(uid: string, tenantId: string): Promise<string> {
    try {

      // Get user data to verify they exist
      const user = await this.firebaseClient.getUserByUid(uid, tenantId);

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Create a custom token for the user
      this.logger.log(`Creating custom token for user ${uid}`);
      const customToken = await this.firebaseClient.createCustomToken(uid, tenantId);
      this.logger.log(`Custom token created: ${customToken ? 'yes' : 'no'}`);

      // Exchange custom token for ID token using Firebase REST API
      const idToken = await this.exchangeCustomTokenForIdToken(customToken, tenantId);

      return idToken;
    } catch (error) {
      this.logger.error(`Failed to get ID token for user ${uid}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Failed to get user authentication token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Exchange custom token for ID token using Firebase REST API
   */
  private async exchangeCustomTokenForIdToken(customToken: string, tenantId: string): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      throw new Error('Firebase API key not configured');
    }

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
        tenantId: tenantId
      })
    });

    if (!response.ok) {
      const error = await response.json() as { error?: { message?: string } };
      const errorCode = error.error?.message || 'Token exchange failed';
      throw new Error(`Failed to exchange custom token: ${errorCode}`);
    }

    const data = await response.json() as { idToken: string };
    return data.idToken;
  }
}
