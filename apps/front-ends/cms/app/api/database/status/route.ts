import { NextResponse } from "next/server";
import { config } from "../../../../lib/config";

export async function GET() {
  try {
    // Test backend API connection instead of direct database access
    const response = await fetch(`${config.apiBaseUrl}/api/health`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (response.ok) {
      return NextResponse.json({
        status: "ok",
        database: {
          connected: true
        },
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(`Backend API returned ${response.status}`);
    }
  } catch (error) {
    console.error("Database status check failed:", error);
    
    return NextResponse.json(
      {
        status: "error",
        database: {
          connected: false
        },
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
