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
    
    // Explicit credentials for better compatibility in serverless environments
    const clientConfig: any = {
      region: config.region,
    };
    
    // In serverless environments, explicitly set credentials if available
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    this.client = new CognitoIdentityProviderClient(clientConfig);
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
  private generateUsernameFromEmail(email: string): string {
    // Replace @ with __at__ but keep dots as dots
    // e.g., "a.dyachuk@icloud.com" → "a.dyachuk__at__icloud.com"
    return email
      .toLowerCase()
      .replace('@', '__at__')
      .substring(0, 64); // Cognito username max length is 128, using 64 for safety
  }

  async signUp(params: SignUpParams): Promise<{ userSub: string; deliveryMedium: string; username: string }> {
    // Generate user-friendly username from email
    const username = this.generateUsernameFromEmail(params.email);

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
      Username: username,
      Password: params.password,
      SecretHash: this.generateSecretHash(username),
      UserAttributes: userAttributes,
    });

    const result = await this.client.send(command);

    return {
      userSub: result.UserSub!,
      deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium || "EMAIL",
      username,
    };
  }

  /**
   * Confirm user sign up with verification code
   */
  async confirmSignUp(params: ConfirmSignUpParams): Promise<void> {
    const command = new ConfirmSignUpCommand({
      ClientId: this.config.clientId,
      Username: params.username,
      ConfirmationCode: params.confirmationCode,
      SecretHash: this.generateSecretHash(params.username),
    });

    await this.client.send(command);
  }

  /**
   * Sign in user with email and password
   */
  async signIn(params: SignInParams): Promise<AuthTokens> {
    // Try login with email first (alias), then with generated username if that fails
    let authError: Error | null = null;

    // First attempt: Login with email (using alias)
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
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
    } catch (error) {
      authError = error as Error;
      // If email login fails, try with generated username format
    }

    // Second attempt: Login with generated username format
    try {
      const generatedUsername = this.generateUsernameFromEmail(params.email);
      const command = new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
          USERNAME: generatedUsername,
          PASSWORD: params.password,
          SECRET_HASH: this.generateSecretHash(generatedUsername),
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
    } catch {
      // Both attempts failed, throw the original error
      throw authError || new Error("Authentication failed");
    }
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
