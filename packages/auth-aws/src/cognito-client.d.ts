import { CognitoConfig, CognitoUser, AuthTokens, SignUpParams, SignInParams, ConfirmSignUpParams, ResetPasswordParams, ConfirmResetPasswordParams, UpdateUserAttributesParams } from "./types";
export declare class CognitoAuthClient {
    private client;
    private config;
    constructor(config: CognitoConfig);
    /**
     * Generate secret hash for Cognito operations
     */
    private generateSecretHash;
    /**
     * Sign up a new user
     */
    private generateUsernameFromEmail;
    signUp(params: SignUpParams): Promise<{
        userSub: string;
        deliveryMedium: string;
        username: string;
    }>;
    /**
     * Confirm user sign up with verification code
     */
    confirmSignUp(params: ConfirmSignUpParams): Promise<void>;
    /**
     * Sign in user with email and password
     */
    signIn(params: SignInParams): Promise<AuthTokens>;
    /**
     * Refresh access token using refresh token
     */
    refreshTokens(refreshToken: string, email: string): Promise<AuthTokens>;
    /**
     * Get user information from access token
     */
    getUser(accessToken: string): Promise<CognitoUser>;
    /**
     * Update user attributes
     */
    updateUserAttributes(params: UpdateUserAttributesParams): Promise<void>;
    /**
     * Initiate forgot password flow
     */
    forgotPassword(params: ResetPasswordParams): Promise<{
        deliveryMedium: string;
    }>;
    /**
     * Confirm forgot password with new password
     */
    confirmForgotPassword(params: ConfirmResetPasswordParams): Promise<void>;
    /**
     * Sign out user globally (invalidate all tokens)
     */
    globalSignOut(accessToken: string): Promise<void>;
}
//# sourceMappingURL=cognito-client.d.ts.map