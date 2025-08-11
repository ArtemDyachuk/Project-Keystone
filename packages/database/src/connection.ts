import mongoose from "mongoose";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Simple cached connection
let isConnected = false;

/**
 * Connect to MongoDB database
 */
export async function connectToDatabase(): Promise<void> {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/keystone";

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
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
  if (!isConnected) return;
  
  await mongoose.disconnect();
  isConnected = false;
  console.log("✅ Disconnected from MongoDB");
}

/**
 * Check if database is connected
 */
export function isConnectedToDatabase(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
