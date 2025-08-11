import { NextResponse } from "next/server";
import { config, debugConfig } from "../../../lib/config";

export async function GET() {
  try {
    // Log configuration for debugging
    debugConfig();
    
    return NextResponse.json({
      status: "ok",
      config: {
        apiBaseUrl: config.apiBaseUrl,
        isProduction: config.isProduction,
        isDevelopment: config.isDevelopment,
        port: config.port,
        railwayEnvironment: config.railwayEnvironment,
        // Don't expose sensitive data like MONGODB_URI
        hasMongoDbUri: !!config.mongodbUri,
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
        RAILWAY_SERVICE_URL: process.env.RAILWAY_SERVICE_URL,
        RAILWAY_PUBLIC_URL: process.env.RAILWAY_PUBLIC_URL,
        PORT: process.env.PORT,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Config debug failed:", error);
    
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
