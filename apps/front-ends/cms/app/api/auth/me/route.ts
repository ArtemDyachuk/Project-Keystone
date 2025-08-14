import { NextRequest, NextResponse } from "next/server";
import { getAuthCookies } from "@/lib/auth-cookies";

export async function GET(request: NextRequest) {
  try {
    const cookies = await getAuthCookies();
    const accessToken = cookies.accessToken;

    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token found" },
        { status: 401 }
      );
    }

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { error: "Failed to get access token" },
      { status: 500 }
    );
  }
}
