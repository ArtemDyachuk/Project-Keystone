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
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Attempting to connect to MongoDB (attempt ${retryCount + 1}/${maxRetries})...`);
      
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000, // 10 seconds for server selection
        socketTimeoutMS: 45000, // 45 seconds for socket operations
        // Connection pool options - optimized for production
        maxPoolSize: 20, // Increased from 10 for better concurrency
        minPoolSize: 5,  // Increased from 1 for better performance
        // Retry options
        retryWrites: true,
        retryReads: true,
        // Additional performance options
        bufferCommands: false, // Disable mongoose buffering
        // Connection timeout
        connectTimeoutMS: 30000, // 30 seconds to establish connection
      });
      
      isConnected = true;
      console.log(`✅ Connected to MongoDB: ${mongoose.connection.db?.databaseName}`);
      return;
    } catch (error) {
      retryCount++;
      
      // Log specific SSL/TLS errors with helpful information
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR') {
        console.error(`❌ SSL/TLS Error on attempt ${retryCount}:`, (error as any).message);
        console.error("💡 This is often caused by MongoDB Atlas SSL compatibility issues.");
        console.error("💡 Try updating your MongoDB Atlas cluster to use TLS 1.2+ or check your connection string.");
      } else {
        console.error(`❌ MongoDB connection attempt ${retryCount} failed:`, error);
      }
      
      if (retryCount >= maxRetries) {
        console.error("❌ Max retry attempts reached. MongoDB connection failed.");
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, retryCount) * 1000;
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
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
