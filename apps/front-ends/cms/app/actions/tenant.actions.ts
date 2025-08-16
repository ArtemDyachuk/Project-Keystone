"use server";

import { config } from "@/lib/config";
import { TenantServiceClient } from "@/app/services/tenant.service";
import { cookies } from "next/headers";

/**
 * Server action to create a new tenant using the backend API
 */
export async function createTenant(name: string) {
  try {
    console.info("🔄 Creating tenant:", name);

    // Get the session cookie from the server
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fb_session")?.value;

    if (!sessionCookie) {
      throw new Error("No session found. Please log in again.");
    }

    // Determine the API base URL
    const apiBaseUrl = config.apiBaseUrl;

    // Call backend CMS API directly with the session cookie
    let response;
    try {
      response = await fetch(`${apiBaseUrl}/api/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cookie": `fb_session=${sessionCookie}`, // Pass session cookie manually
        },
        body: JSON.stringify({ name: name.trim() }),
      });

    } catch (fetchError) {
      console.error("❌ Failed to call backend API:", fetchError);

      try {
        // For server actions, we need to use the full URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
        response = await fetch(`${baseUrl}/api/tenants/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: name.trim() }),
        });

        console.log("✅ Local API route response status:", response.status);
      } catch (localError) {
        console.error("❌ Both backend API and local API route failed:", localError);
        throw new Error("Failed to create tenant - all API endpoints unavailable");
      }
    }

    if (!response.ok) {
      let errorMessage = "Failed to create tenant";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
        console.error("Failed to parse error response as JSON:", parseError);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    console.log("✅ Tenant created successfully.");

    // The backend now handles Firebase tenant creation and database updates
    // No need to duplicate this logic in the frontend

    // Revalidate paths that use tenant data to force fresh data loading
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout"); // Revalidate all layouts
    revalidatePath("/tenants"); // Revalidate tenants page
    revalidatePath("/dashboard"); // Revalidate dashboard
    revalidatePath("/tenants/create"); // Revalidate create page

    return {
      success: true,
      tenant: result,
      firebaseTenantId: result.firebaseTenantId || null, // Get from backend result
      message: result.message || "Tenant created successfully",
      requiresReauth: result.requiresReauth || false
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
    // Get the session cookie from the server
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fb_session")?.value;

    if (!sessionCookie) {
      console.error("No session found when fetching user tenants");
      return [];
    }

    // Get user ID from session cookie (this will be verified by the backend)
    // Pass the session cookie in the request headers
    const response = await fetch("/api/tenants/user/me", {
      headers: {
        "Cookie": `fb_session=${sessionCookie}`, // Pass session cookie manually
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch user tenants from backend");
      return [];
    }

    const result = await response.json();

    // Convert the backend response to match your existing format
    return result.tenants.map((tenant: any) => ({
      _id: tenant._id,
      name: tenant.name,
      domain: tenant.domain,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      role: "admin", // Default role for now
    }));
  } catch (error) {
    console.error("❌ Get user tenants error:", error);
    return [];
  }
}

/**
 * Server action to get fresh user data and tenants for layout
 * This ensures consistent data between layout and pages using the service layer
 */
export async function getUserDataAndTenants() {
  try {
    // Import the user actions service and tenant service
    const { getCurrentUser } = await import("@/app/actions/user.actions");
    const { TenantServiceClient } = await import("@/app/services/tenant.service");

    // Get fresh user data (includes updated custom claims from Firebase)
    const userData = await getCurrentUser();

    if (!userData) {
      return {
        userData: null,
        userTenants: [],
        selectedTenant: null
      };
    }

    // Get user's tenants using the service layer
    let userTenants: any[] = [];

    if (userData.tenantIds && userData.tenantIds.length > 0) {
      try {
        // Use TenantServiceClient to get tenant details
        userTenants = await TenantServiceClient.getTenantsByIds(userData.tenantIds);
      } catch (error) {
        console.warn("Failed to get tenants via service, falling back to API call:", error);

        // Fallback: use the existing getUserTenants function which calls the API
        userTenants = await getUserTenants();
      }
    }

    // Find selected tenant with robust comparison
    let selectedTenant = userTenants.find(tenant => {
      const tenantId = String(tenant._id);
      const selectedId = String(userData?.selectedTenantId);
      return tenantId === selectedId;
    }) || null;

    // Fallback: if no tenant is selected or selected tenant doesn't exist, use the first available
    if (!selectedTenant && userTenants.length > 0) {
      selectedTenant = userTenants[0];
    }

    return {
      userData,
      userTenants,
      selectedTenant
    };
  } catch (error) {
    console.error("❌ Get user data and tenants error:", error);
    return {
      userData: null,
      userTenants: [],
      selectedTenant: null
    };
  }
}

/**
 * Server action to update user's selected tenant
 * This updates the Firebase custom claims to set the new selected tenant
 */
export async function updateSelectedTenant(tenantId: string) {
  try {
    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

    // Get the session cookie from the server
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("fb_session")?.value;

    if (!sessionCookie) {
      throw new Error("No session found. Please log in again.");
    }

    // Determine the API base URL
    let apiBaseUrl = config.apiBaseUrl;
    if (!apiBaseUrl || apiBaseUrl === "undefined") {
      apiBaseUrl = "http://localhost:3001";
    }

    console.log("🔄 Updating selected tenant to:", tenantId);

    // Call backend API to update selected tenant
    const response = await fetch(`${apiBaseUrl}/api/user/selected-tenant`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `fb_session=${sessionCookie}`,
      },
      body: JSON.stringify({ selectedTenantId: tenantId }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to update selected tenant";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    console.log("✅ Selected tenant updated successfully:", result);

    // Revalidate paths that use tenant data to force fresh data loading
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout"); // Revalidate all layouts
    revalidatePath("/dashboard"); // Revalidate dashboard

    return {
      success: true,
      selectedTenantId: tenantId,
      message: result.message || "Selected tenant updated successfully"
    };
  } catch (error) {
    console.error("❌ Update selected tenant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
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

    // Delete tenant via backend API (which handles session cookies and custom claims)
    try {
      // Get the session cookie from the server
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("fb_session")?.value;

      if (!sessionCookie) {
        throw new Error("No session found. Please log in again.");
      }

      // Use the backend API URL instead of relative URL
      const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
        method: "DELETE",
        headers: {
          "Cookie": `fb_session=${sessionCookie}`, // Pass session cookie manually
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete tenant: ${response.status} ${response.statusText}`);
      }
    } catch (apiError) {
      console.error("❌ Failed to delete tenant via API:", apiError);
      throw new Error("Failed to delete organization");
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


