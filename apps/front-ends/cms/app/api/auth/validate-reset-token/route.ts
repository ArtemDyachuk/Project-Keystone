import { NextRequest, NextResponse } from "next/server";
import { verifyResetToken } from "@keystone/auth";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify and decode the JWT token
    const decoded = verifyResetToken(token);

    return NextResponse.json({ 
      success: true,
      email: decoded.email,
      message: "Token is valid"
    });
  } catch (error) {
    console.error("Token validation error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Invalid token" 
      },
      { status: 400 }
    );
  }
}
