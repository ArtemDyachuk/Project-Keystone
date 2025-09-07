import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SignupWithEmailLinkDto {
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName!: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName!: string;

  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  @MaxLength(100, { message: 'Company name cannot exceed 100 characters' })
  companyName!: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}

export class MfaLoginDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsString()
  @MinLength(6, { message: 'Verification code must be at least 6 characters' })
  @MaxLength(6, { message: 'Verification code cannot exceed 6 characters' })
  verificationCode!: string;
}

export class StepUpDto {
  @IsString()
  @MinLength(6, { message: 'Verification code must be at least 6 characters' })
  @MaxLength(6, { message: 'Verification code cannot exceed 6 characters' })
  verificationCode!: string;
}

export class VerifyEmailDto {
  @IsString()
  uid!: string;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class SetPasswordDto {
  @IsString()
  uid!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;

  @IsString()
  oobCode!: string;

  @IsString()
  @IsOptional()
  tenantId?: string;
}

export class InitiateSignupDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  companyName!: string;

  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  firstName!: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  lastName!: string;
}

export class VerifySignupTokenDto {
  @IsString()
  token!: string;
}

export class CompleteInviteDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}
