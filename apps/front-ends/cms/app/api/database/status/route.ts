import { NextResponse } from "next/server";
import { initializeDatabase, getDatabaseStatus } from "../../../../lib/database";

export async function GET() {
  try {
    // Initialize database connection if not already done
    await initializeDatabase();
    
    const status = getDatabaseStatus();
    
    return NextResponse.json({
      status: "ok",
      database: status,
      timestamp: new Date().toISOString()
    });
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
