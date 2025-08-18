#!/usr/bin/env ts-node
/**
 * Migration script: Convert single role to roles array in TenantMember collection
 * 
 * This script migrates existing TenantMember documents from:
 * { role: "tenant_owner" } 
 * to:
 * { roles: ["tenant_owner"] }
 * 
 * Run with: ts-node scripts/migrate-roles-to-array.ts
 */

import { connectToDatabase } from "@keystone/database";
import mongoose from "mongoose";

interface OldTenantMember {
  _id: string;
  userId: string;
  tenantId: string;
  role: string; // Old single role field
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface NewTenantMember {
  _id: string;
  userId: string;
  tenantId: string;
  roles: string[]; // New roles array field
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

async function migrateRolesToArray() {
  try {
    console.log("🔄 Connecting to database...");
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const collection = db.collection("tenantmembers");
    
    console.log("🔍 Finding documents with old role field...");
    
    // Find all documents that have 'role' field but not 'roles' field
    const oldDocs = await collection.find({
      role: { $exists: true },
      roles: { $exists: false }
    }).toArray() as any[];
    
    console.log(`📊 Found ${oldDocs.length} documents to migrate`);
    
    if (oldDocs.length === 0) {
      console.log("✅ No documents need migration");
      return;
    }

    let migrated = 0;
    let errors = 0;

    for (const doc of oldDocs) {
      try {
        // Convert single role to roles array
        const roles = doc.role ? [doc.role] : ["tenant_user"]; // Default fallback
        
        console.log(`🔄 Migrating ${doc.userId} in tenant ${doc.tenantId}: ${doc.role} -> [${roles.join(", ")}]`);
        
        // Update document: add roles array, remove old role field
        await collection.updateOne(
          { _id: new mongoose.Types.ObjectId(doc._id) },
          {
            $set: { roles },
            $unset: { role: "" }
          }
        );
        
        migrated++;
      } catch (error) {
        console.error(`❌ Error migrating document ${doc._id}:`, error);
        errors++;
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📄 Total processed: ${oldDocs.length}`);
    
    if (errors === 0) {
      console.log("\n🎉 Migration completed successfully!");
    } else {
      console.log(`\n⚠️ Migration completed with ${errors} errors`);
    }

  } catch (error) {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Database connection closed");
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateRolesToArray()
    .then(() => {
      console.log("🏁 Migration script finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration script failed:", error);
      process.exit(1);
    });
}

export { migrateRolesToArray };
