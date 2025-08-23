"use server";

import { config } from "@/lib/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server action to update a corporation
 */
export async function updateCorporation(formData: FormData) {
   try {
      const id = formData.get("id") as string;
      const name = formData.get("name") as string;

      if (!id) {
         throw new Error("Corporation ID is required");
      }

      if (!name?.trim()) {
         throw new Error("Corporation name is required");
      }

      // Get session cookie from server-side cookies
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value;

      if (!sessionId) {
         throw new Error("Authentication required");
      }

      // Update corporation via backend API using session authentication
      const response = await fetch(`${config.apiBaseUrl}/api/corporations/${id}`, {
         method: "PUT",
         headers: {
            "Content-Type": "application/json",
            Cookie: `session=${sessionId}`, // Forward session cookie manually
         },
         body: JSON.stringify({
            name: name.trim(),
         }),
      });

      if (!response.ok) {
         let errorMessage = "Failed to update corporation";
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

      await response.json();

      // Redirect to corporation page after successful update
      redirect(`/corporations/${id}`);
   } catch (error) {
      console.error("❌ Update corporation error:", error);
      throw error;
   }
}

/**
 * Server action to delete a corporation
 */
export async function deleteCorporation(id: string) {
   try {
      if (!id) {
         throw new Error("Corporation ID is required");
      }

      // Get session cookie from server-side cookies
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value;

      if (!sessionId) {
         throw new Error("Authentication required");
      }

      // Delete corporation via backend API using session authentication
      const response = await fetch(`${config.apiBaseUrl}/api/corporations/${id}`, {
         method: "DELETE",
         headers: {
            "Content-Type": "application/json",
            Cookie: `session=${sessionId}`, // Forward session cookie manually
         },
      });

      if (!response.ok) {
         let errorMessage = "Failed to delete corporation";
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

      // Return success instead of redirecting
      // The client component will handle navigation
      return { success: true, message: "Corporation deleted successfully" };
   } catch (error) {
      console.error("❌ Delete corporation error:", error);
      throw error;
   }
}

/**
 * Server action to update selected corporation and redirect
 */
export async function updateSelectedCorporationAndRedirect(corporationId: string) {
   try {
      if (!corporationId) {
         throw new Error("Corporation ID is required");
      }

      // Get session cookie from server-side cookies
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value;

      if (!sessionId) {
         throw new Error("Authentication required");
      }

      // Update selected corporation via backend API using session authentication
      const response = await fetch(`${config.apiBaseUrl}/api/corporations/${corporationId}/select`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Cookie: `session=${sessionId}`, // Forward session cookie manually
         },
      });

      if (!response.ok) {
         let errorMessage = "Failed to update selected corporation";
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
      return { success: true, data: result };
   } catch (error) {
      console.error("❌ Update selected corporation error:", error);
      throw error;
   }
}

/**
 * Server action to create a new corporation
 */
export async function createCorporation(formData: FormData) {
   try {
      const name = formData.get("name") as string;
      const tenantId = formData.get("tenantId") as string;

      if (!name?.trim()) {
         throw new Error("Corporation name is required");
      }

      if (!tenantId) {
         throw new Error("Tenant ID is required");
      }

      // Get session cookie from server-side cookies
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("session")?.value;

      if (!sessionId) {
         throw new Error("Authentication required");
      }

      // Create corporation via backend API using session authentication
      const response = await fetch(`${config.apiBaseUrl}/api/corporations`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
            Cookie: `session=${sessionId}`, // Forward session cookie manually
         },
         body: JSON.stringify({
            name: name.trim(),
            tenantId: tenantId,
         }),
      });

      if (!response.ok) {
         let errorMessage = "Failed to create corporation";
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

      // Return success instead of redirecting
      // The client component will handle navigation
      return { success: true, message: "Corporation created successfully", data: result };
   } catch (error) {
      console.error("❌ Create corporation error:", error);
      throw error;
   }
}
