import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig } from "@keystone/auth";
import { createHmac } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    const config = await getCognitoConfig();

    // Generate secret hash for the username
    const secretHash = createHmac("sha256", config.clientSecret)
      .update(username + config.clientId)
      .digest("base64");

    // Use AWS SDK directly for resend (bypassing our client which doesn't have this method)
    const { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } = await import("@aws-sdk/client-cognito-identity-provider");

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

    const command = new ResendConfirmationCodeCommand({
      ClientId: config.clientId,
      Username: username,
      SecretHash: secretHash,
    });

    await cognitoClient.send(command);

    return NextResponse.json({
      success: true,
      message: "Verification code resent successfully"
    });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to resend code" },
      { status: 400 }
    );
  }
}
