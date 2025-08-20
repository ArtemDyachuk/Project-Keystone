import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // Since auth is temporarily disabled, return an error
    throw new Error("Cognito not configured - auth temporarily disabled");

    // Original code commented out:
    // const { username, password } = await request.json();
    // const config = await getCognitoConfig();
    // const { CognitoIdentityProviderClient, AdminSetUserPasswordCommand } = await import("@aws-sdk/client-cognito-identity-provider");
    // const clientConfig: any = { region: config.region };
    // if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    //   clientConfig.credentials = {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //   };
    // }
    // const cognitoClient = new CognitoIdentityProviderClient(clientConfig);
    // const command = new AdminSetUserPasswordCommand({
    //   UserPoolId: config.userPoolId,
    //   Username: username,
    //   Password: password,
    //   Permanent: true,
    // });
    // await cognitoClient.send(command);
    // return NextResponse.json({
    //   success: true,
    //   message: "Password set successfully"
    // });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to set password" },
      { status: 400 }
    );
  }
}
