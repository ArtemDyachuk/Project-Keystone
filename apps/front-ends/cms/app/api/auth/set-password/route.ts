import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const config = await getCognitoConfig();

    // Use AWS SDK directly to set permanent password
    const { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } = await import("@aws-sdk/client-cognito-identity-provider");

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

    const cognitoClient = new CognitoIdentityProviderClient(clientConfig);

    const command = new AdminSetUserPasswordCommand({
      UserPoolId: config.userPoolId,
      Username: username,
      Password: password,
      Permanent: true, // Set as permanent password
    });

    await cognitoClient.send(command);

    return NextResponse.json({
      success: true,
      message: "Password set successfully"
    });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to set password" },
      { status: 400 }
    );
  }
}
