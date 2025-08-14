"use server";

import { getAuthCookies, setAuthCookiesInAction } from "@/lib/auth-cookies";
import { config } from "@/lib/config";

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
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update selected tenant");
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
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update selected tenant");
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
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create organization");
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
 * Server action to delete a tenant (no redirect - client handles navigation)
 */
export async function deleteTenant(tenantId: string) {
  try {
    const { accessToken, refreshToken } = await getAuthCookies();

    if (!accessToken) {
      throw new Error("No access token found. Please log in again.");
    }

    // Delete tenant via backend API
    const response = await fetch(`${config.apiBaseUrl}/api/tenants/${tenantId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: refreshToken || undefined }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete organization");
    }

    const result = await response.json();

    // If backend returned fresh tokens, update cookies
    if (result.tokens) {
      await setAuthCookiesInAction(result.tokens);
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Delete tenant error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
