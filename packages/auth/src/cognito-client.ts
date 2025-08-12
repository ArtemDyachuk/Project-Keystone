import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  UpdateUserAttributesCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  AuthFlowType,
  type AttributeType,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import {
  CognitoConfig,
  CognitoUser,
  AuthTokens,
  SignUpParams,
  SignInParams,
  ConfirmSignUpParams,
  ResetPasswordParams,
  ConfirmResetPasswordParams,
  UpdateUserAttributesParams,
} from "./types";

export class CognitoAuthClient {
  private client: CognitoIdentityProviderClient;
  private config: CognitoConfig;

  constructor(config: CognitoConfig) {
    this.config = config;
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
    });
  }

  /**
   * Generate secret hash for Cognito operations
   */
  private generateSecretHash(username: string): string {
    return createHmac("sha256", this.config.clientSecret)
      .update(username + this.config.clientId)
      .digest("base64");
  }

  /**
   * Sign up a new user
   */
  async signUp(params: SignUpParams): Promise<{ userSub: string; deliveryMedium: string }> {
    const userAttributes = [
      { Name: "email", Value: params.email },
      { Name: "given_name", Value: params.givenName },
      { Name: "family_name", Value: params.familyName },
    ];

    if (params.tenantId) {
      userAttributes.push({ Name: "custom:tenantId", Value: params.tenantId });
    }

    if (params.role) {
      userAttributes.push({ Name: "custom:role", Value: params.role });
    }

    const command = new SignUpCommand({
      ClientId: this.config.clientId,
      Username: params.email,
      Password: params.password,
      SecretHash: this.generateSecretHash(params.email),
      UserAttributes: userAttributes,
    });

    const result = await this.client.send(command);

    return {
      userSub: result.UserSub!,
      deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium || "EMAIL",
    };
  }

  /**
   * Confirm user sign up with verification code
   */
  async confirmSignUp(params: ConfirmSignUpParams): Promise<void> {
    const command = new ConfirmSignUpCommand({
      ClientId: this.config.clientId,
      Username: params.email,
      ConfirmationCode: params.confirmationCode,
      SecretHash: this.generateSecretHash(params.email),
    });

    await this.client.send(command);
  }

  /**
   * Sign in user with email and password
   */
  async signIn(params: SignInParams): Promise<AuthTokens> {
    const command = new InitiateAuthCommand({
      ClientId: this.config.clientId,
      AuthFlow: AuthFlowType.USER_SRP_AUTH,
      AuthParameters: {
        USERNAME: params.email,
        PASSWORD: params.password,
        SECRET_HASH: this.generateSecretHash(params.email),
      },
    });

    const result = await this.client.send(command);

    if (result.ChallengeName) {
      throw new Error(`Authentication challenge not supported: ${result.ChallengeName}`);
    }

    if (!result.AuthenticationResult) {
      throw new Error("Authentication failed");
    }

    return {
      accessToken: result.AuthenticationResult.AccessToken!,
      idToken: result.AuthenticationResult.IdToken!,
      refreshToken: result.AuthenticationResult.RefreshToken!,
      expiresIn: result.AuthenticationResult.ExpiresIn!,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string, email: string): Promise<AuthTokens> {
    const command = new InitiateAuthCommand({
      ClientId: this.config.clientId,
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: this.generateSecretHash(email),
      },
    });

    const result = await this.client.send(command);

    if (!result.AuthenticationResult) {
      throw new Error("Token refresh failed");
    }

    return {
      accessToken: result.AuthenticationResult.AccessToken!,
      idToken: result.AuthenticationResult.IdToken!,
      refreshToken: refreshToken, // Refresh token doesn't change
      expiresIn: result.AuthenticationResult.ExpiresIn!,
    };
  }

  /**
   * Get user information from access token
   */
  async getUser(accessToken: string): Promise<CognitoUser> {
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const result = await this.client.send(command);

    const attributes = result.UserAttributes || [];
    const attributeMap: Record<string, string> = {};

    attributes.forEach((attr: AttributeType) => {
      if (attr.Name && attr.Value) {
        attributeMap[attr.Name] = attr.Value;
      }
    });

    return {
      sub: attributeMap.sub,
      email: attributeMap.email,
      email_verified: attributeMap.email_verified === "true",
      given_name: attributeMap.given_name,
      family_name: attributeMap.family_name,
      "custom:tenantId": attributeMap["custom:tenantId"],
      "custom:role": attributeMap["custom:role"],
    };
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(params: UpdateUserAttributesParams): Promise<void> {
    const userAttributes = Object.entries(params.attributes).map(([name, value]) => ({
      Name: name,
      Value: value,
    }));

    const command = new UpdateUserAttributesCommand({
      AccessToken: params.accessToken,
      UserAttributes: userAttributes,
    });

    await this.client.send(command);
  }

  /**
   * Initiate forgot password flow
   */
  async forgotPassword(params: ResetPasswordParams): Promise<{ deliveryMedium: string }> {
    const command = new ForgotPasswordCommand({
      ClientId: this.config.clientId,
      Username: params.email,
      SecretHash: this.generateSecretHash(params.email),
    });

    const result = await this.client.send(command);

    return {
      deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium || "EMAIL",
    };
  }

  /**
   * Confirm forgot password with new password
   */
  async confirmForgotPassword(params: ConfirmResetPasswordParams): Promise<void> {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: this.config.clientId,
      Username: params.email,
      ConfirmationCode: params.confirmationCode,
      Password: params.newPassword,
      SecretHash: this.generateSecretHash(params.email),
    });

    await this.client.send(command);
  }

  /**
   * Sign out user globally (invalidate all tokens)
   */
  async globalSignOut(accessToken: string): Promise<void> {
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });

    await this.client.send(command);
  }
}
