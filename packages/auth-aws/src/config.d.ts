import { CognitoConfig } from "./types";
/**
 * Get Cognito configuration from environment variables or AWS Parameter Store
 * Supports both local development and production environments
 */
export declare function getCognitoConfig(environment?: string): Promise<CognitoConfig>;
/**
 * Get the OAuth URLs for Cognito
 */
export declare function getCognitoUrls(config: CognitoConfig): {
    authorization: string;
    token: string;
    userInfo: string;
    logout: string;
    jwks: string;
};
//# sourceMappingURL=config.d.ts.map