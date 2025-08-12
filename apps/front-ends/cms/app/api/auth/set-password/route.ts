import { NextRequest, NextResponse } from "next/server";
import { getCognitoConfig } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const config = await getCognitoConfig();

    console.log("🔍 Set Password - Config check:", {
      userPoolId: config.userPoolId,
      region: config.region,
      awsProfile: process.env.AWS_PROFILE || "default",
    });

    // Use AWS SDK directly to set permanent password
    const { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } = await import("@aws-sdk/client-cognito-identity-provider");

    const cognitoClient = new CognitoIdentityProviderClient({
      region: config.region,
    });

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
