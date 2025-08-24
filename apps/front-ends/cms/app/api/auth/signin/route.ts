import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, tenantId } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Call our backend login endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, tenantId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || "Login failed" },
        { status: response.status }
      );
    }

    // Set the session cookies from the backend response
    const responseHeaders = new Headers();
    if (result.sessionId) {
      responseHeaders.set("Set-Cookie", `session=${result.sessionId}; Path=/; HttpOnly; SameSite=Lax`);
    }
    if (result.csrfToken) {
      responseHeaders.set("Set-Cookie", `csrf=${result.csrfToken}; Path=/; SameSite=Lax`);
    }

    return NextResponse.json(result, { headers: responseHeaders });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 }
    );
  }
}
