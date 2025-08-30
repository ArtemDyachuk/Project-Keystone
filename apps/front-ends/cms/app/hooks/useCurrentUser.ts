"use client";

import { useEffect, useState } from "react";
import type { CurrentUser } from "@/lib/sessions/utils";
import { config } from "@/lib/config";

/**
 * Hook to get the current authenticated user
 * Fetches user data from the session API endpoint
 */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/user/me`, { 
          credentials: "include" 
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.user) {
            setUser(result.user);
          }
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
      }
    };

    getUser();
  }, []);

  return user;
}
