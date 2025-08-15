"use server";

import { getAuthCookies, setAuthCookiesInAction } from "@/lib/auth-cookies";
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
 * Server action to create a new tenant
 */
export async function createTenant(name: string) {
  try {
    const { accessToken, refreshToken } = await getAuthCookies();

    if (!accessToken) {
      throw new Error("No access token found. Please log in again.");
    }

    // Create tenant via backend API
    const response = await fetch(`${config.apiBaseUrl}/api/tenants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: name.trim(),
        refreshToken: refreshToken || undefined
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

    // If backend returned fresh tokens, update cookies
    if (result.tokens) {
      await setAuthCookiesInAction(result.tokens);
    }

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
export async function updateTenant(tenantId: string, updateData: Record<string, any>) {
  try {
    if (!tenantId) {
      throw new Error("Tenant ID is required");
    }

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
 * Server action to delete a tenant
 * Takes tenantId, returns result
 */
export async function deleteTenant(tenantId: string) {
  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  const deleted = await TenantServiceClient.deleteTenant(tenantId);

  if (!deleted) {
    throw new Error("Failed to delete organization - tenant not found or access denied");
  }

  // Revalidate the tenants list page
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/tenants");

  // Server-side redirect to avoid client component re-render issues
  const { redirect } = await import("next/navigation");
  redirect("/tenants");
}


