import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Since auth is temporarily disabled, return an error
    throw new Error("Cognito not configured - auth temporarily disabled");

    // Original code commented out:
    // const { username } = await request.json();
    // const config = await getCognitoConfig();
    // const secretHash = createHmac("sha256", config.clientSecret)
    //   .update(username + config.clientId)
    //   .digest("base64");
    // const { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } = await import("@aws-sdk/client-cognito-identity-provider");
    // const clientConfig: any = { region: config.region };
    // if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    //   clientConfig.credentials = {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //   };
    // }
    // const cognitoClient = new CognitoIdentityProviderClient(clientConfig);
    // const command = new ResendConfirmationCodeCommand({
    //   ClientId: config.clientId,
    //   Username: username,
    //   SecretHash: secretHash,
    // });
    // await cognitoClient.send(command);
    // return NextResponse.json({
    //   success: true,
    //   message: "Verification code resent successfully"
    // });
  } catch (error) {
    console.error("Resend error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to resend code" },
      { status: 400 }
    );
  }
}
