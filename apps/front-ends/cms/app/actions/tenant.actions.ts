"use server";

import { config } from "@/lib/config";
// import { TenantServiceClient } from "@/app/services/tenant.service";
import { cookies } from "next/headers";

/**
 * Check if user needs to create a tenant
 */
export async function checkTenantRequirement(userId: string) {
  try {
    if (!userId) {
      return { needsTenant: true };
    }

    // Get session cookie from server-side cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      return { needsTenant: true };
    }

    // The backend gets the user from the authenticated session
    // We just need to make an authenticated request
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/check-requirement`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionId}`, // Forward session cookie manually
      },
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    }

    // If the check fails, default to requiring tenant creation
    return { needsTenant: true };
  } catch (error) {
    console.error("❌ Check tenant requirement failed:", error);
    // Default to requiring tenant creation if check fails
    return { needsTenant: true };
  }
}

/**
 * Server action to update user's selected tenant
 * This runs on the server and has access to HTTP-only cookies
 */
export async function updateSelectedTenant(tenantId: string) {
  try {
    // Get session cookie from server-side cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      throw new Error("Authentication required");
    }

    // Call backend CMS API using session authentication
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/user/selected`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionId}`, // Forward session cookie manually
      },
      body: JSON.stringify({ tenantId }),
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

    return {
      success: true,
      message: result.message || "Tenant updated successfully"
    };
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
    // Get session cookie from server-side cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      throw new Error("Authentication required");
    }

    // Call backend CMS API using session authentication
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/user/selected`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionId}`, // Forward session cookie manually
      },
      body: JSON.stringify({ tenantId }),
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

    return { success: true, message: "Tenant updated successfully" };
  } catch (error) {
    console.error("❌ Server action error:", error);
    throw error;
  }
}

/**
 * Server action to create a new tenant
 */
export async function createTenant(name: string) {
  try {
    // Get session cookie from server-side cookies
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      throw new Error("Authentication required");
    }

    // Create tenant via backend API using session authentication
    const response = await fetch(`${config.apiBaseUrl}/api/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionId}`, // Forward session cookie manually
      },
      body: JSON.stringify({
        name: name.trim(),
      }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to create organization";
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

    return { success: true, tenant: result };
  } catch (error) {
    console.error("❌ Create tenant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Server action to update tenant
 * Takes tenantId and updateData object, returns result
 */
export async function updateTenant(tenantId: string, updateData: Record<string, string | number | boolean | Date | null | undefined>) {
  try {
    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

    // Get session cookie for authentication
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      throw new Error("Authentication required");
    }

    // Update tenant via backend API using session authentication
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionId}`, // Forward session cookie manually
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      let errorMessage = "Failed to update organization";
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

    // Revalidate to show updated data in other parts of the app
    const { revalidatePath } = await import("next/cache");
    revalidatePath(`/tenants/${tenantId}`);

    return { success: true, tenant: result };
  } catch (error) {
    console.error("❌ Update tenant error:", error);
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

    // Get session cookie for authentication
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session")?.value;

    if (!sessionId) {
      throw new Error("Authentication required");
    }

    // Delete tenant via backend API using session authentication
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session=${sessionId}`, // Forward session cookie manually
      },
    });

    if (!response.ok) {
      let errorMessage = "Failed to delete organization";
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

    // Revalidate the tenants list page
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/tenants");

    return { success: true, message: result.message };
  } catch (error) {
    console.error("❌ Delete tenant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}


