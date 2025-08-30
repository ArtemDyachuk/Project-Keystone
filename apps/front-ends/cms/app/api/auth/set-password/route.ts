import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { uid, password, tenantId } = await request.json();

    if (!uid || !password) {
      return NextResponse.json(
        { success: false, error: "UID and password are required" },
        { status: 400 }
      );
    }

    // Call our backend set-password endpoint
    const response = await fetch(`${config.apiBaseUrl}/api/auth/set-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid, password, tenantId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: result.message || "Failed to set password" },
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to set password" },
      { status: 500 }
    );
  }
}
