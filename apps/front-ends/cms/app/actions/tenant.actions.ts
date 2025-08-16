"use server";

import { getAuthCookies, setAuthCookiesInAction } from "@/lib/auth/cookies";
import {
  createFirebaseAuthTenant,
  addTenantAccessToUser,
  forceRefreshUserToken,
  deleteFirebaseAuthTenant,
  removeTenantAccessFromUser,
  createTenantManagementService,
  decodeJwtToken
} from "@keystone/auth";
import { config } from "@/lib/config";
import { TenantServiceClient } from "@/app/services/tenant.service";

/**
 * Server action to update user's selected tenant
 * This runs on the server and has access to HTTP-only cookies
 */
export async function updateSelectedTenant(tenantId: string) {
  try {
    // Get tokens from HTTP-only cookies
    const { accessToken, refreshToken } = await getAuthCookies();

    if (!accessToken) {
      throw new Error("No access token found. Please log in again.");
    }

    // Call backend CMS API to update tenant and get fresh tokens
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/user/selected`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tenantId,
        refreshToken: refreshToken || undefined
      }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to update selected tenant";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // If response is not JSON (e.g., HTML error page), use status text
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error("Failed to parse error response as JSON:", parseError);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // If backend returned fresh tokens, update cookies
    if (result.tokens) {
      await setAuthCookiesInAction(result.tokens);

      return {
        success: true,
        message: result.message,
        tokensRefreshed: true
      };
    } else {
      return {
        success: true,
        message: result.message,
        tokensRefreshed: false,
        refreshError: result.refreshError || "Backend did not return fresh tokens"
      };
    }
  } catch (error) {
    console.error("❌ Server action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to update tenant and redirect to dashboard
 * This ensures fresh data is loaded with updated tenant context
 * Always redirects to dashboard since switching tenants affects the entire workspace
 */
export async function updateSelectedTenantAndRedirect(tenantId: string) {
  try {
    // Get tokens from HTTP-only cookies
    const { accessToken, refreshToken } = await getAuthCookies();

    if (!accessToken) {
      throw new Error("No access token found. Please log in again.");
    }

    // Call backend CMS API to update tenant and get fresh tokens
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/user/selected`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tenantId,
        refreshToken: refreshToken || undefined
      }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to update selected tenant";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // If response is not JSON (e.g., HTML error page), use status text
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error("Failed to parse error response as JSON:", parseError);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    // If backend returned fresh tokens, update cookies
    if (result.tokens) {
      await setAuthCookiesInAction(result.tokens);
    }

    return { success: true, message: "Tenant updated successfully" };
  } catch (error) {
    console.error("❌ Server action error:", error);
    throw error;
  }
}

/**
 * Server action to create a new tenant using MongoDB and Firebase Auth
 */
export async function createTenant(name: string) {
  try {
    const { accessToken } = await getAuthCookies();

    if (!accessToken) {
      throw new Error("No access token found. Please log in again.");
    }

    // Get user ID from JWT token
    const decoded = decodeJwtToken((accessToken ?? "") as string);
    if (!decoded || !decoded.sub) {
      throw new Error("Invalid access token");
    }

    // Create tenant in MongoDB using shared database service
    const tenant = await TenantServiceClient.createTenantInDatabase(name);

    // Try to create Firebase Auth tenant (GIP multi-tenancy)
    let firebaseTenantId: string | null = null;
    try {
      console.log("🔄 Attempting to create Firebase Auth tenant...");

      const firebaseTenant = await createFirebaseAuthTenant({
        displayName: name.trim(),
        allowPasswordSignUp: true,
        allowEmailLinkSignIn: false,
      });
      firebaseTenantId = firebaseTenant.tenantId;
      console.log("✅ Firebase Auth tenant created:", firebaseTenantId);

      // Update MongoDB tenant with Firebase tenant ID
      if (firebaseTenantId) {
        try {
          // Import TenantService directly for database operations
          const { TenantService, connectToDatabase } = await import("@keystone/database");
          await connectToDatabase();

          // Update tenant directly in database
          await TenantService.updateTenant(tenant._id, {
            firebaseTenantId: firebaseTenantId
          });

          console.log("✅ Firebase tenant ID saved to MongoDB:", firebaseTenantId);
        } catch (updateError) {
          console.warn("⚠️ Failed to save Firebase tenant ID to MongoDB:", updateError);
          // Don't fail the whole operation - tenant exists in MongoDB
        }
      }
    } catch (firebaseError) {
      console.error("❌ Firebase Auth tenant creation failed:", firebaseError);
      console.warn("⚠️ This usually means GIP multi-tenancy is not enabled");
      // Continue without Firebase Auth tenant - MongoDB tenant still exists
    }

    // Update Firebase Custom Claims to include new tenant access
    try {
      console.log("🔄 Updating Firebase Custom Claims for tenant:", tenant._id);


      await addTenantAccessToUser(decoded.sub, tenant._id, "admin");

      console.log("✅ Firebase Custom Claims updated for new tenant");

      // Force refresh the user's token to include new tenant data
      try {

        await forceRefreshUserToken(decoded.sub);
        console.log("✅ User token refreshed with new tenant data");

        // Force user to re-authenticate by invalidating their session
        // This ensures they get a fresh token with updated claims
        console.log("🔄 User will need to re-authenticate to get updated claims");
      } catch (refreshError) {
        console.warn("⚠️ Token refresh failed (user will need to re-login):", refreshError);
      }
    } catch (firebaseError) {
      console.error("❌ Failed to update Firebase claims:", firebaseError);
      // Don't fail the whole operation - tenant exists in MongoDB
    }

    return {
      success: true,
      tenant,
      firebaseTenantId, // Include Firebase tenant ID if created
      message: firebaseTenantId
        ? `Tenant created in MongoDB and Firebase Auth (${firebaseTenantId})`
        : "Tenant created in MongoDB (Firebase Auth tenant creation failed)",
      requiresReauth: true // Signal that user needs to re-authenticate
    };
  } catch (error) {
    console.error("❌ Create tenant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to update tenant using Firebase
 * Takes tenantId and updateData object, returns result
 */
export async function updateTenant(tenantId: string, updateData: Record<string, any>) {
  try {
    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

    // For now, we'll use the existing TenantServiceClient
    // TODO: Implement Firebase tenant update
    const updatedTenant = await TenantServiceClient.updateTenant(tenantId, updateData);

    if (!updatedTenant) {
      throw new Error("Failed to update organization - tenant not found or access denied");
    }

    // Revalidate to show updated data in other parts of the app
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/tenants/${tenantId}`);

    return { success: true, tenant: updatedTenant };
  } catch (error) {
    console.error("❌ Update tenant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to get user's tenants from Firebase
 */
export async function getUserTenants() {
  try {
    // Import Firebase tenant service directly

    const tenantService = createTenantManagementService();

    // Get user ID from JWT token
    const { accessToken } = await getAuthCookies();

    const decoded = decodeJwtToken((accessToken ?? "") as string);

    if (!decoded || !decoded.sub) {
      console.error("No valid user ID found");
      return [];
    }

    // Get tenants directly using Firebase service
    const userId = decoded.sub;
    if (!userId) {
      console.error("No valid user ID found");
      return [];
    }

    const userTenants = await tenantService.getUserTenants(userId as string);

    // Convert Firebase tenant format to match your existing format
    return userTenants.map((userTenant) => ({
      _id: userTenant.tenant.id,
      name: userTenant.tenant.name,
      domain: userTenant.tenant.domain,
      createdAt: userTenant.tenant.createdAt,
      updatedAt: userTenant.tenant.updatedAt,
      role: userTenant.role,
    }));
  } catch (error) {
    console.error("❌ Get user tenants error:", error);
    return [];
  }
}

/**
 * Server action to delete a tenant
 * Takes tenantId, returns result
 */
export async function deleteTenant(tenantId: string) {
  try {
    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

    // Get user ID from JWT token
    const { accessToken } = await getAuthCookies();
    const decoded = decodeJwtToken((accessToken ?? "") as string);

    if (!decoded || !decoded.sub) {
      throw new Error("No valid user ID found");
    }

    // First, get tenant info to find Firebase tenant ID
    const { TenantService, connectToDatabase } = await import("@keystone/database");
    await connectToDatabase();

    const tenant = await TenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Delete Firebase Auth tenant if it exists
    if (tenant.firebaseTenantId) {
      try {
        console.log("🔄 Deleting Firebase Auth tenant:", tenant.firebaseTenantId);

        await deleteFirebaseAuthTenant(tenant.firebaseTenantId);
        console.log("✅ Firebase Auth tenant deleted");
      } catch (firebaseError) {
        console.warn("⚠️ Failed to delete Firebase Auth tenant:", firebaseError);
        // Continue with MongoDB deletion
      }
    }

    // Remove tenant from user's custom claims
    try {
      console.log("🔄 Removing tenant from user custom claims");

      await removeTenantAccessFromUser(decoded.sub, tenantId);
      console.log("✅ Tenant removed from custom claims");

      // Force refresh the user's token to include updated claims
      try {

        await forceRefreshUserToken(decoded.sub);
        console.log("✅ User token refreshed after tenant removal");
      } catch (refreshError) {
        console.warn("⚠️ Token refresh failed (user will need to re-login):", refreshError);
      }
    } catch (claimsError) {
      console.warn("⚠️ Failed to update custom claims:", claimsError);
      // Continue with MongoDB deletion
    }

    // Delete from MongoDB directly (bypass API access control)
    try {
      console.log("🔄 Deleting tenant from MongoDB:", tenantId);
      await TenantService.deleteTenant(tenantId);
      console.log("✅ Tenant deleted from MongoDB");
    } catch (dbError) {
      console.error("❌ Failed to delete tenant from MongoDB:", dbError);
      throw new Error("Failed to delete organization from database");
    }

    // Revalidate the tenants list page
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/tenants");

    // Return success with redirect info instead of throwing redirect
    return {
      success: true,
      message: "Tenant deleted successfully",
      redirectTo: "/tenants"
    };
  } catch (error) {
    console.error("❌ Delete tenant error:", error);
    throw error;
  }
}


