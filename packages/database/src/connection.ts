import mongoose from "mongoose";

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase(): Promise<void> {
  // Return early if already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI environment variable is required");
  }

  try {
    await mongoose.connect(uri, {
      bufferCommands: false, // Critical: Disable buffering to prevent race conditions
    });

    // Wait for the connection to be fully established
    await new Promise<void>((resolve) => {
      if (mongoose.connection.readyState === 1) {
        resolve();
      } else {
        mongoose.connection.once('connected', () => resolve());
      }
    });

    console.log(`✅ Connected to MongoDB: ${mongoose.connection.db?.databaseName}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  }
}

/**
 * Check if database is connected
 */
export function isConnectedToDatabase(): boolean {
  return mongoose.connection.readyState === 1;
}
