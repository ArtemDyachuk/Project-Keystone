import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    // Get the session cookie from the request
    const sessionCookie = request.cookies.get("fb_session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Tenant name is required" }, { status: 400 });
    }

    console.log("🔄 Creating tenant via backend API:", name);

    // Forward the request to the backend API with all session cookies
    const allCookies = request.cookies.getAll();
    const cookieHeader = allCookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');

    const response = await fetch(`${config.apiBaseUrl}/api/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookieHeader, // Pass all cookies including fb_session and sid
      },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to create tenant";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const result = await response.json();

    // Return the result from the backend
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Create tenant error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
