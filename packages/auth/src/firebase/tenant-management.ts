import { getFirebaseAdminAuth } from "./admin";
import { getFirebaseAdminFirestore } from "./admin";

export interface Tenant {
  id: string;
  name: string;
  domain?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTenantAccess {
  userId: string;
  tenantId: string;
  role: "admin" | "user" | "viewer";
  grantedAt: Date;
}

/**
 * Tenant Management Service for Firebase Multi-Tenancy
 * Integrates with your existing tenant database and Firebase Custom Claims
 */
export class TenantManagementService {
  private auth;
  private db;

  constructor() {
    this.auth = getFirebaseAdminAuth();
    this.db = getFirebaseAdminFirestore();
  }

  /**
   * Create a new tenant and assign creator as admin
   */
  async createTenant(tenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt">, creatorUserId: string): Promise<Tenant> {
    try {
      // Create tenant in your database (using your existing setup)
      const tenant: Tenant = {
        ...tenantData,
        id: this.generateTenantId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store tenant in Firestore
      await this.db.collection("tenants").doc(tenant.id).set(tenant);

      // Create user-tenant relationship
      await this.db.collection("userTenants").doc(`${creatorUserId}_${tenant.id}`).set({
        userId: creatorUserId,
        tenantId: tenant.id,
        role: "admin",
        grantedAt: new Date(),
      });

      // Update user's Firebase Custom Claims
      await this.updateUserTenantClaims(creatorUserId);

      console.log(`✅ Tenant "${tenant.name}" created successfully`);
      return tenant;
    } catch (error) {
      console.error("Failed to create tenant:", error);
      throw new Error("Failed to create tenant");
    }
  }

  /**
   * Update user's tenant access in Firebase (Custom Claims only)
   * This is the correct way - no data duplication
   */
  async updateUserTenantAccess(userId: string, tenantId: string, role: string = "admin"): Promise<void> {
    try {
      console.log(`🔄 Updating Firebase Custom Claims for user ${userId} in tenant ${tenantId}`);

      // Create user-tenant relationship in Firestore (for access control only)
      await this.db.collection("userTenants").doc(`${userId}_${tenantId}`).set({
        userId,
        tenantId,
        role,
        grantedAt: new Date(),
      });

      // Update user's Firebase Custom Claims
      await this.db.collection("userTenants").doc(`${userId}_${tenantId}`).set({
        userId,
        tenantId,
        role,
        grantedAt: new Date(),
      });

      // Update user's Firebase Custom Claims
      await this.updateUserTenantClaims(userId);

      console.log(`✅ Firebase Custom Claims updated for user ${userId} in tenant ${tenantId}`);
    } catch (error) {
      console.error("Failed to update Firebase Custom Claims:", error);
      throw new Error("Failed to update Firebase Custom Claims");
    }
  }

  /**
   * Create tenant in Firebase using existing MongoDB tenant data
   * This is used when tenant is already created in MongoDB
   */
  async createTenantInFirebase(tenantData: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }, creatorUserId: string): Promise<void> {
    try {
      console.log("🔄 Creating tenant in Firebase:", tenantData.id);

      // Store tenant in Firestore
      await this.db.collection("tenants").doc(tenantData.id).set({
        id: tenantData.id,
        name: tenantData.name,
        createdAt: tenantData.createdAt,
        updatedAt: tenantData.updatedAt,
      });

      // Create user-tenant relationship
      await this.db.collection("userTenants").doc(`${creatorUserId}_${tenantData.id}`).set({
        userId: creatorUserId,
        tenantId: tenantData.id,
        role: "admin",
        grantedAt: new Date(),
      });

      // Update user's Firebase Custom Claims
      await this.updateUserTenantClaims(creatorUserId);

      console.log(`✅ Firebase tenant "${tenantData.name}" created successfully`);
    } catch (error) {
      console.error("Failed to create tenant in Firebase:", error);
      throw new Error("Failed to create tenant in Firebase");
    }
  }

  /**
   * Add user to a tenant with specific role
   */
  async addUserToTenant(userId: string, tenantId: string, role: "admin" | "user" | "viewer" = "user"): Promise<void> {
    try {
      // Verify tenant exists
      const tenantDoc = await this.db.collection("tenants").doc(tenantId).get();
      if (!tenantDoc.exists) {
        throw new Error("Tenant not found");
      }

      // Create user-tenant relationship
      await this.db.collection("userTenants").doc(`${userId}_${tenantId}`).set({
        userId,
        tenantId,
        role,
        grantedAt: new Date(),
      });

      // Update user's Firebase Custom Claims
      await this.updateUserTenantClaims(userId);

      console.log(`✅ User ${userId} added to tenant ${tenantId} with role ${role}`);
    } catch (error) {
      console.error("Failed to add user to tenant:", error);
      throw new Error("Failed to add user to tenant");
    }
  }

  /**
   * Remove user from a tenant
   */
  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    try {
      // Remove user-tenant relationship
      await this.db.collection("userTenants").doc(`${userId}_${tenantId}`).delete();

      // Update user's Firebase Custom Claims
      await this.updateUserTenantClaims(userId);

      console.log(`✅ User ${userId} removed from tenant ${tenantId}`);
    } catch (error) {
      console.error("Failed to remove user from tenant:", error);
      throw new Error("Failed to remove user from tenant");
    }
  }

  /**
   * Get all tenants for a user
   */
  async getUserTenants(userId: string): Promise<{ tenant: Tenant; role: string }[]> {
    try {
      const userTenantsSnapshot = await this.db
        .collection("userTenants")
        .where("userId", "==", userId)
        .get();

      const userTenants: { tenant: Tenant; role: string }[] = [];

      for (const doc of userTenantsSnapshot.docs) {
        const userTenant = doc.data() as UserTenantAccess;
        const tenantDoc = await this.db.collection("tenants").doc(userTenant.tenantId).get();
        
        if (tenantDoc.exists) {
          userTenants.push({
            tenant: tenantDoc.data() as Tenant,
            role: userTenant.role,
          });
        }
      }

      return userTenants;
    } catch (error) {
      console.error("Failed to get user tenants:", error);
      throw new Error("Failed to get user tenants");
    }
  }

  /**
   * Get all users in a tenant
   */
  async getTenantUsers(tenantId: string): Promise<UserTenantAccess[]> {
    try {
      const tenantUsersSnapshot = await this.db
        .collection("userTenants")
        .where("tenantId", "==", tenantId)
        .get();

      return tenantUsersSnapshot.docs.map(doc => doc.data() as UserTenantAccess);
    } catch (error) {
      console.error("Failed to get tenant users:", error);
      throw new Error("Failed to get tenant users");
    }
  }

  /**
   * Update user's Firebase Custom Claims with tenant information
   */
  private async updateUserTenantClaims(userId: string): Promise<void> {
    try {
      // Get user's current tenants
      const userTenants = await this.getUserTenants(userId);
      
      // Prepare custom claims
      const customClaims = {
        tenantIds: userTenants.map(ut => ut.tenant.id),
        tenantRoles: userTenants.reduce((acc, ut) => {
          acc[ut.tenant.id] = ut.role;
          return acc;
        }, {} as Record<string, string>),
        selectedTenantId: userTenants.length > 0 ? userTenants[0].tenant.id : null,
      };

      // Update Firebase Custom Claims
      await this.auth.setCustomUserClaims(userId, customClaims);

      console.log(`✅ Updated custom claims for user ${userId}:`, customClaims);
    } catch (error) {
      console.error("Failed to update user claims:", error);
      throw new Error("Failed to update user claims");
    }
  }

  /**
   * Generate unique tenant ID
   */
  private generateTenantId(): string {
    return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user's current tenant claims from Firebase
   */
  async getUserClaims(userId: string): Promise<any> {
    try {
      const userRecord = await this.auth.getUser(userId);
      return userRecord.customClaims || {};
    } catch (error) {
      console.error("Failed to get user claims:", error);
      return {};
    }
  }

  /**
   * Check if user has access to a specific tenant
   */
  async hasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    try {
      const claims = await this.getUserClaims(userId);
      return claims.tenantIds && claims.tenantIds.includes(tenantId);
    } catch (error) {
      console.error("Failed to check tenant access:", error);
      return false;
    }
  }

  /**
   * Get user's role in a specific tenant
   */
  async getUserTenantRole(userId: string, tenantId: string): Promise<string | null> {
    try {
      const claims = await this.getUserClaims(userId);
      return claims.tenantRoles?.[tenantId] || null;
    } catch (error) {
      console.error("Failed to get user tenant role:", error);
      return null;
    }
  }
}

/**
 * Factory function to create tenant management service
 */
export function createTenantManagementService(): TenantManagementService {
  return new TenantManagementService();
}
