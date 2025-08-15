import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig } from "@keystone/auth";

/**
 * Debug endpoint to test AWS/Cognito setup in production
 * REMOVE AFTER DEBUGGING
 */
export async function GET(request: NextRequest) {
  try {
    // Test 1: Try to get Cognito config (this uses environment variables)
    const cognitoConfig = await getCognitoConfig();
    
    // Test 2: Try to create Cognito client like the signup does
    const { CognitoIdentityProviderClient } = await import("@aws-sdk/client-cognito-identity-provider");
    
    const cognitoClientConfig: any = {
      region: cognitoConfig.region,
    };
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      cognitoClientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    const cognitoClient = new CognitoIdentityProviderClient(cognitoClientConfig);

    // Test 3: Try to simulate what happens in signup (without actually signing up)
    const testConfig = {
      userPoolId: cognitoConfig.userPoolId,
      clientId: cognitoConfig.clientId,
      region: cognitoConfig.region,
      hasClientSecret: !!cognitoConfig.clientSecret,
    };

    return NextResponse.json({
      success: true,
      cognitoConfig: testConfig,
      cognitoClientCreated: !!cognitoClient,
      awsCredentialsExplicit: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
      message: "Cognito client created successfully"
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorName: error instanceof Error ? error.name : "Unknown",
        details: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : []
      },
      { status: 500 }
    );
  }
}
