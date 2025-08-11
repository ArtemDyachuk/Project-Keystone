import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all Railway-related environment variables
    const railwayVars = Object.keys(process.env)
      .filter(key => key.startsWith('RAILWAY_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
      }, {} as Record<string, string | undefined>);

    // Get other relevant environment variables
    const otherVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      MONGODB_URI: process.env.MONGODB_URI ? '✅ Set' : '❌ Not set',
    };

    return NextResponse.json({
      status: "ok",
      railway: railwayVars,
      other: otherVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Railway env check failed:", error);
    
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
