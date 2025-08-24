import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import { SignupVerification } from "@keystone/database";
import { EmailService } from "./email.service";
import { Types } from "mongoose";
import * as crypto from "crypto";

export interface InitiateSignupRequest {
  email: string;
  companyName: string;
  firstName: string;
  lastName: string;
}

export interface CompleteSignupRequest {
  token: string;
  firstName: string;
  lastName: string;
}

export interface InitiateInviteRequest {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  invitedBy: string;
  tenantId: string; // Keep as string for now, will convert to ObjectId
}

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(private readonly emailService: EmailService) { }

  /**
   * Generate a cryptographically secure random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Initiate a new user signup
   */
  async initiateSignup(request: InitiateSignupRequest): Promise<void> {
    try {
      this.logger.log(`🔄 Initiating signup for ${request.email}`);

      // Generate secure token
      const token = this.generateToken();

      // Calculate expiry (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Create verification record
      const verification = new SignupVerification({
        token,
        email: request.email.trim().toLowerCase(),
        companyName: request.companyName.trim(),
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        type: "signup",
        roles: ["Tenant:Owner", "Global:Admin"], // Company creator should be the owner and global admin
        expiresAt,
      });

      await verification.save();
      this.logger.log(`✅ Signup verification record created for ${request.email}`);

      // Send verification email
      await this.sendSignupVerificationEmail(request.email, token, request.companyName);

      this.logger.log(`✅ Signup verification email sent to ${request.email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initiate signup for ${request.email}:`, error);
      throw new HttpException(
        "Failed to initiate signup. Please try again.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Initiate a user invite
   */
  async initiateInvite(request: InitiateInviteRequest): Promise<void> {
    try {
      this.logger.log(`🔄 Initiating invite for ${request.email}`);

      // Generate secure token
      const token = this.generateToken();

      // Calculate expiry (15 minutes from now)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      // Create verification record
      const verification = new SignupVerification({
        token,
        email: request.email.trim().toLowerCase(),
        type: "invite",
        invitedBy: request.invitedBy,
        tenantId: new Types.ObjectId(request.tenantId), // Convert string to ObjectId
        roles: request.roles,
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        expiresAt,
      });

      await verification.save();
      this.logger.log(`✅ Invite verification record created for ${request.email}`);

      // Send verification email
      await this.sendInviteVerificationEmail(request.email, token, request.firstName);

      this.logger.log(`✅ Invite verification email sent to ${request.email}`);
    } catch (error) {
      this.logger.error(`❌ Failed to initiate invite for ${request.email}:`, error);
      throw new HttpException(
        "Failed to send invite. Please try again.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify a signup or invite token
   */
  async verifyToken(token: string): Promise<{
    type: "signup" | "invite";
    email: string;
    companyName?: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    invitedBy?: string;
    tenantId?: string; // Keep as string for now, will convert to ObjectId
  }> {
    try {
      this.logger.log(`🔄 Verifying token: ${token.substring(0, 8)}...`);

      // Find verification record
      const verification = await SignupVerification.findOne({ token });

      if (!verification) {
        throw new HttpException("Invalid or expired verification token", HttpStatus.BAD_REQUEST);
      }

      // Check if expired
      if (verification.expiresAt < new Date()) {
        // Delete expired record
        await SignupVerification.deleteOne({ token });
        throw new HttpException("Verification token has expired", HttpStatus.BAD_REQUEST);
      }

      this.logger.log(`✅ Token verified for ${verification.email}`);

      return {
        type: verification.type,
        email: verification.email,
        companyName: verification.companyName,
        firstName: verification.firstName,
        lastName: verification.lastName,
        roles: verification.roles,
        invitedBy: verification.invitedBy,
        tenantId: verification.tenantId?.toString(), // Convert ObjectId to string
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`❌ Token verification failed:`, error);
      throw new HttpException(
        "Failed to verify token. Please try again.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete verification record after successful completion
   */
  async deleteVerification(token: string): Promise<void> {
    try {
      await SignupVerification.deleteOne({ token });
      this.logger.log(`✅ Verification record deleted for token: ${token.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete verification record:`, error);
      // Don't throw error as this is cleanup
    }
  }

  /**
   * Send signup verification email
   */
  private async sendSignupVerificationEmail(email: string, token: string, companyName: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_CMS_URL}/auth/verify-signup?token=${token}`;

    const htmlContent = `
      <h2>Welcome to ${companyName}!</h2>
      <p>Click the button below to verify your email and complete your account setup:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;margin:20px 0;">
        Verify Email & Complete Signup
      </a>
      <p>Or copy and paste this link:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p><strong>This link expires in 15 minutes.</strong></p>
      <p>If you didn't request this signup, you can safely ignore this email.</p>
    `;

    await this.emailService.sendEmail({
      to: email,
      subject: `Complete your ${companyName} account setup`,
      html: htmlContent,
    });
  }

  /**
   * Send invite verification email
   */
  private async sendInviteVerificationEmail(email: string, token: string, firstName: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_CMS_URL}/auth/verify-invite?token=${token}`;

    const htmlContent = `
      <h2>You've been invited to join Keystone!</h2>
      <p>Hi ${firstName},</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <a href="${verificationUrl}" style="display:inline-block;padding:12px 24px;background:#007bff;color:#fff;text-decoration:none;border-radius:6px;margin:20px 0;">
        Accept Invitation
      </a>
      <p>Or copy and paste this link:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p><strong>This invitation expires in 15 minutes.</strong></p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    `;

    await this.emailService.sendEmail({
      to: email,
      subject: "You've been invited to join Keystone",
      html: htmlContent,
    });
  }
}
