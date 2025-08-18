import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { CognitoConfig, ZitadelConfig } from "./types";

let cachedConfig: CognitoConfig | null = null;

/**
 * Get Cognito configuration from environment variables or AWS Parameter Store
 * Supports both local development and production environments
 */
export async function getCognitoConfig(environment?: string): Promise<CognitoConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = environment || process.env.NODE_ENV || "development";

  // For browser/client-side, use public environment variables
  if (typeof window !== "undefined") {
    const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";

    if (!userPoolId || !clientId || !domain) {
      throw new Error("Missing required Cognito environment variables. Please set NEXT_PUBLIC_COGNITO_USER_POOL_ID, NEXT_PUBLIC_COGNITO_CLIENT_ID, and NEXT_PUBLIC_COGNITO_DOMAIN in your .env.local file.");
    }

    cachedConfig = {
      userPoolId,
      clientId,
      clientSecret: "", // Not needed for public client
      domain,
      region,
    };
    return cachedConfig;
  }

  // For server-side, use environment variables
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  const domain = process.env.COGNITO_DOMAIN;
  const region = process.env.AWS_REGION || "us-east-1";

  if (userPoolId && clientId && domain) {
    cachedConfig = {
      userPoolId,
      clientId,
      clientSecret: process.env.COGNITO_CLIENT_SECRET || "",
      domain,
      region,
    };
    console.log("✅ Using environment variables config");
    return cachedConfig;
  }

  // For production, fetch from AWS Parameter Store
  try {
    const ssmConfig: any = {
      region: process.env.AWS_REGION || "us-east-1",
    };
    
    // In serverless environments, explicitly set credentials if available
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      ssmConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    const ssmClient = new SSMClient(ssmConfig);

    const [userPoolId, clientId, domain, region] = await Promise.all([
      getParameter(ssmClient, `/keystone/${env}/cognito/user-pool-id`),
      getParameter(ssmClient, `/keystone/${env}/cognito/client-id`),
      getParameter(ssmClient, `/keystone/${env}/cognito/domain`),
      getParameter(ssmClient, `/keystone/${env}/cognito/region`),
    ]);

    // Client secret needs to be handled separately as it's sensitive
    const clientSecret = await getCognitoClientSecret(clientId, region);

    cachedConfig = {
      userPoolId,
      clientId,
      clientSecret,
      domain,
      region,
    };

    return cachedConfig;
  } catch (error) {
    console.error("Failed to fetch Cognito configuration:", error);
    throw new Error(
      "Cognito environment variables not found. Please check your .env file contains COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, etc."
    );
  }
}

let cachedZitadelConfig: ZitadelConfig | null = null;

/**
 * Get ZITADEL configuration from environment variables
 */
export async function getZitadelConfig(): Promise<ZitadelConfig> {
  if (cachedZitadelConfig) {
    return cachedZitadelConfig;
  }

  if (typeof window !== "undefined") {
    const issuer = process.env.NEXT_PUBLIC_ZITADEL_ISSUER;
    const clientId = process.env.NEXT_PUBLIC_ZITADEL_CLIENT_ID;
    if (!issuer || !clientId) {
      throw new Error("Missing ZITADEL public env: NEXT_PUBLIC_ZITADEL_ISSUER, NEXT_PUBLIC_ZITADEL_CLIENT_ID");
    }
    cachedZitadelConfig = {
      issuer,
      clientId,
      clientSecret: "",
    };
    return cachedZitadelConfig;
  }

  const issuer = process.env.ZITADEL_ISSUER;
  const clientId = process.env.ZITADEL_CLIENT_ID;
  const clientSecret = process.env.ZITADEL_CLIENT_SECRET || "";

  if (!issuer || !clientId) {
    throw new Error("Missing ZITADEL env: ZITADEL_ISSUER, ZITADEL_CLIENT_ID");
  }

  cachedZitadelConfig = { issuer, clientId, clientSecret };
  return cachedZitadelConfig;
}

async function getParameter(ssmClient: SSMClient, name: string): Promise<string> {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true,
  });

  const result = await ssmClient.send(command);
  if (!result.Parameter?.Value) {
    throw new Error(`Parameter ${name} not found`);
  }

  return result.Parameter.Value;
}

async function getCognitoClientSecret(_clientId: string, _region: string): Promise<string> {
  // In production, you might want to store the client secret in AWS Secrets Manager
  // For now, we'll try to get it from environment variables
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error(
      "COGNITO_CLIENT_SECRET environment variable is required. " +
      "Consider storing this in AWS Secrets Manager for production."
    );
  }
  return clientSecret;
}

/**
 * Get the OAuth URLs for Cognito
 */
export function getCognitoUrls(config: CognitoConfig) {
  const baseUrl = `https://${config.domain}.auth.${config.region}.amazoncognito.com`;

  return {
    authorization: `${baseUrl}/oauth2/authorize`,
    token: `${baseUrl}/oauth2/token`,
    userInfo: `${baseUrl}/oauth2/userInfo`,
    logout: `${baseUrl}/logout`,
    jwks: `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`,
  };
}
