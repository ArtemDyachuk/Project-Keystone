import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    // Get the session cookie from the request
    const sessionCookie = request.cookies.get("fb_session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    console.log("🔄 Fetching user tenants from backend API");

    // Forward the request to the backend API with the session cookie
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/user/me`, {
      headers: {
        "Cookie": `fb_session=${sessionCookie}`, // Pass session cookie to backend
      },
    });

    if (!response.ok) {
      console.error("❌ Backend API error:", response.status);
      return NextResponse.json(
        { error: "Failed to fetch user tenants" },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log("✅ User tenants fetched from backend:", result.tenants?.length || 0);

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Error in user tenants API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
