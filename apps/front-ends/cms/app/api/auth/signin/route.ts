import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // Since auth is temporarily disabled, return an error
    throw new Error("Cognito not configured - auth temporarily disabled");

    // Original code commented out:
    // const { email, password } = await request.json();
    // if (!email || !password) {
    //   return NextResponse.json(
    //     { error: "Email and password are required" },
    //     { status: 400 }
    //   );
    // }
    // const config = await getCognitoConfig();
    // const authClient = new CognitoAuthClient(config);
    // const tokens = await authClient.signIn({ email, password });
    // return setAuthCookies(tokens);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
