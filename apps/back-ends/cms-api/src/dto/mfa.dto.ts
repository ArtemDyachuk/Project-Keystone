import { IsString, IsNotEmpty, Length } from 'class-validator';

/**
 * DTO for starting MFA enrollment
 */
export class StartMfaEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

/**
 * DTO for completing MFA enrollment
 */
export class FinishMfaEnrollmentDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  verificationCode!: string;
}

/**
 * DTO for MFA unenrollment
 */
export class UnenrollMfaDto {
  // No body required - uses session from cookie
}

/**
 * Response interface for MFA enrollment start
 */
export interface MfaEnrollmentStartResponse {
  success: boolean;
  message: string;
  qrCodeUrl?: string;
  otpauthUrl?: string;
  sessionInfo?: string;
}

/**
 * Response interface for MFA enrollment finish
 */
export interface MfaEnrollmentFinishResponse {
  success: boolean;
  message: string;
  mfaEnabled: boolean;
  mfaEnrolledAt?: number;
}

/**
 * Response interface for MFA unenrollment
 */
export interface MfaUnenrollmentResponse {
  success: boolean;
  message: string;
  mfaEnabled: boolean;
}

/**
 * Response interface for MFA status
 */
export interface MfaStatusResponse {
  success: boolean;
  mfaEnabled: boolean;
  mfaEnrolledAt?: number;
  message?: string;
}
