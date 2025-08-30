import { Tenant } from "../app/components/tenants/types";

import { config } from "./config";
const API_BASE = config.apiBaseUrl;

export interface CreateTenantDto {
  name: string;
}

export interface UpdateTenantDto {
  name: string;
}

// ===== LOCALSTORAGE UTILITIES =====

export const getCurrentTenant = () => {
  if (typeof window === "undefined") return null;

  const tenantId = localStorage.getItem("currentTenantId");
  const tenantName = localStorage.getItem("currentTenantName");

  return tenantId && tenantName ? { id: tenantId, name: tenantName } : null;
};

export const setCurrentTenant = (tenantId: string, tenantName: string) => {
  if (typeof window === "undefined") return;

  localStorage.setItem("currentTenantId", tenantId);
  localStorage.setItem("currentTenantName", tenantName);
};

export const clearCurrentTenant = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("currentTenantId");
  localStorage.removeItem("currentTenantName");
};

export const getCurrentTenantId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("currentTenantId");
};

export const getCurrentTenantName = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("currentTenantName");
};

// ===== API UTILITIES =====

export async function getTenants(): Promise<Tenant[]> {
  try {
    // Get access token for authorization
    const tokenResponse = await fetch("/api/auth/me", { credentials: "include" });
    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token");
    }
    const { accessToken } = await tokenResponse.json();

    const response = await fetch(`${API_BASE}/api/tenants`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      credentials: "include", // Include cookies for auth
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tenants: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return [];
  }
}

export async function getTenant(id: string): Promise<Tenant | null> {
  try {
    // Get access token for authorization
    const tokenResponse = await fetch("/api/auth/me", { credentials: "include" });
    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token");
    }
    const { accessToken } = await tokenResponse.json();

    const response = await fetch(`${API_BASE}/api/tenants/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      credentials: "include", // Include cookies for auth
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch tenant: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return null;
  }
}

export async function createTenant(data: CreateTenantDto): Promise<Tenant> {
  // Get access token for authorization
  const tokenResponse = await fetch("/api/auth/me", { credentials: "include" });
  if (!tokenResponse.ok) {
    throw new Error("Failed to get access token");
  }
  const { accessToken } = await tokenResponse.json();

  const response = await fetch(`${API_BASE}/api/tenants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create tenant");
  }

  return await response.json();
}

export async function updateTenant(id: string, data: UpdateTenantDto): Promise<Tenant> {
  // Get access token for authorization
  const tokenResponse = await fetch("/api/auth/me", { credentials: "include" });
  if (!tokenResponse.ok) {
    throw new Error("Failed to get access token");
  }
  const { accessToken } = await tokenResponse.json();

  const response = await fetch(`${API_BASE}/api/tenants/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to update tenant");
  }

  return await response.json();
}

export async function deleteTenant(id: string): Promise<void> {
  // Get access token for authorization
  const tokenResponse = await fetch("/api/auth/me", { credentials: "include" });
  if (!tokenResponse.ok) {
    throw new Error("Failed to get access token");
  }
  const { accessToken } = await tokenResponse.json();

  const response = await fetch(`${API_BASE}/api/tenants/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to delete tenant");
  }
}
