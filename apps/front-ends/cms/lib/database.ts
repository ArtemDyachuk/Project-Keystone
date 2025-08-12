import { connectToDatabase, isConnectedToDatabase } from "../src/shared/database";

/**
 * Initialize database connection for Next.js
 */
export async function initializeDatabase() {
  try {
    await connectToDatabase();
    console.log("✅ CMS Frontend: Database connection established");
  } catch (error) {
    console.error("❌ CMS Frontend: Failed to connect to database", error);
    throw error;
  }
}

/**
 * Get database connection status
 */
export function getDatabaseStatus() {
  return {
    connected: isConnectedToDatabase()
  };
}
