import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint to test AWS calls in production
 * REMOVE AFTER DEBUGGING
 */
export async function GET(request: NextRequest) {
  try {
    // Test 1: Simple STS call to verify credentials
    const { STSClient, GetCallerIdentityCommand } = await import("@aws-sdk/client-sts");
    
    const stsConfig: any = {
      region: process.env.AWS_REGION || "us-east-1",
    };
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      stsConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    const stsClient = new STSClient(stsConfig);
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));

    // Test 2: Try to create Cognito client
    const { CognitoIdentityProviderClient } = await import("@aws-sdk/client-cognito-identity-provider");
    
    const cognitoConfig: any = {
      region: process.env.AWS_REGION || "us-east-1",
    };
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      cognitoConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    
    const cognitoClient = new CognitoIdentityProviderClient(cognitoConfig);

    return NextResponse.json({
      success: true,
      identity: {
        account: identity.Account,
        userId: identity.UserId?.substring(0, 10) + "...",
        arn: identity.Arn,
      },
      cognitoClientCreated: !!cognitoClient,
      message: "AWS credentials are working correctly"
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
