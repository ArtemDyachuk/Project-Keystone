"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserServer } from "@/lib/sessions/server";
import { config } from "@/lib/config";

export interface UpdateUserRequest {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export async function updateUserAction(userId: string, data: UpdateUserRequest) {
  try {
    // Get current user to verify they can update this account
    const currentUser = await getCurrentUserServer();

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    // Users can only update their own account
    if (currentUser.uid !== userId) {
      throw new Error("Unauthorized: Can only update your own account");
    }

    // Call the user service to update the user
    const response = await fetch(`${config.apiBaseUrl}/api/user/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update user");
    }

    // Revalidate the account page to show updated data
    revalidatePath("/account");

    return { success: true, message: "Account updated successfully" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update account"
    };
  }
}

export async function getUserAction(userId: string) {
  try {
    const currentUser = await getCurrentUserServer();

    if (!currentUser) {
      throw new Error("Not authenticated");
    }

    // Users can only view their own account
    if (currentUser.uid !== userId) {
      throw new Error("Unauthorized: Can only view your own account");
    }

    const response = await fetch(`${config.apiBaseUrl}/api/user/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user data");
    }

    const userData = await response.json();
    return { success: true, user: userData.user };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch user data"
    };
  }
}
