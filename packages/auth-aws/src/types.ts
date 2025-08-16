export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  clientSecret: string;
  domain: string;
  region: string;
}

export interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  given_name: string;
  family_name: string;
  "custom:tenantId"?: string;
  "custom:role"?: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DecodedToken {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string;
  family_name?: string;
  "custom:tenantId"?: string;
  "custom:role"?: string;
  "custom:tenantIds"?: string;
  "custom:selectedTenantId"?: string;
  aud?: string;
  auth_time?: number;
  exp: number;
  iat: number;
  iss?: string;
  token_use?: "access" | "id";
  username?: string;
  client_id?: string;
  origin_jti?: string;
  event_id?: string;
  scope?: string;
  jti?: string;
}

export interface SignUpParams {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
  tenantId?: string;
  role?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface ConfirmSignUpParams {
  username: string;
  confirmationCode: string;
}

export interface ResetPasswordParams {
  email: string;
}

export interface ConfirmResetPasswordParams {
  email: string;
  confirmationCode: string;
  newPassword: string;
}

export interface UpdateUserAttributesParams {
  accessToken: string;
  attributes: Record<string, string>;
}
