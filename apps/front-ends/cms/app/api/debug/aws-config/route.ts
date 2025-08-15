import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint to check AWS configuration in production
 * REMOVE AFTER DEBUGGING - Contains sensitive info
 */
export async function GET(request: NextRequest) {
  try {
    // Check if environment variables are properly set
    const awsConfig = {
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      hasRegion: !!process.env.AWS_REGION,
      accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.substring(0, 5) + "...",
      secretKeyPrefix: process.env.AWS_SECRET_ACCESS_KEY?.substring(0, 5) + "...",
      region: process.env.AWS_REGION,
      accessKeyLength: process.env.AWS_ACCESS_KEY_ID?.length,
      secretKeyLength: process.env.AWS_SECRET_ACCESS_KEY?.length,
    };

    const cognitoConfig = {
      hasUserPoolId: !!process.env.COGNITO_USER_POOL_ID,
      hasClientId: !!process.env.COGNITO_CLIENT_ID,
      hasClientSecret: !!process.env.COGNITO_CLIENT_SECRET,
      hasDomain: !!process.env.COGNITO_DOMAIN,
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      clientIdPrefix: process.env.COGNITO_CLIENT_ID?.substring(0, 5) + "...",
      domainPrefix: process.env.COGNITO_DOMAIN?.substring(0, 10) + "...",
    };

    return NextResponse.json({
      aws: awsConfig,
      cognito: cognitoConfig,
      nodeEnv: process.env.NODE_ENV,
      platform: "vercel",
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to get debug info",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
