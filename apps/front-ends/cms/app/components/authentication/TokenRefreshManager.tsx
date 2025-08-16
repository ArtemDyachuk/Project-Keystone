"use client";

import { useEffect, useRef } from "react";

// Client-safe function for checking token expiration
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return true;
    }

    const payload = JSON.parse(atob(parts[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true; // If we can't decode, assume expired
  }
}

interface TokenRefreshManagerProps {
  children: React.ReactNode;
}

export function TokenRefreshManager({ children }: TokenRefreshManagerProps) {
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // Function to refresh tokens proactively
  const refreshTokensProactively = async () => {
    try {
      // Get tokens from cookies
      const cookies = document.cookie.split(";");
      const accessTokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith("accessToken=")
      );
      const refreshTokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith("refreshToken=")
      );
      const idTokenCookie = cookies.find(cookie => 
        cookie.trim().startsWith("idToken=")
      );

      if (!accessTokenCookie || !refreshTokenCookie || !idTokenCookie) {
        console.log("🔄 No tokens found, skipping proactive refresh");
        return;
      }

      const accessToken = accessTokenCookie.split("=")[1];
      const refreshToken = refreshTokenCookie.split("=")[1];
      const idToken = idTokenCookie.split("=")[1];

      // Check if access token is expired or will expire soon (within 1 hour)
      if (isTokenExpired(accessToken)) {
        console.log("🔄 Access token expired, attempting proactive refresh...");
      } else {
        // Check if token expires within the next hour
        try {
          const payload = JSON.parse(atob(accessToken.split(".")[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = payload.exp - currentTime;
          
          // If token expires within the next hour, refresh it
          if (timeUntilExpiry > 3600) {
            console.log("🔄 Token expires in more than 1 hour, skipping proactive refresh");
            return;
          }
          
          console.log(`🔄 Token expires in ${timeUntilExpiry} seconds, refreshing proactively...`);
        } catch {
          console.log("🔄 Could not decode token, attempting refresh...");
        }
      }

      // Extract user email from ID token
      let userEmail: string | null = null;
      try {
        const payload = JSON.parse(atob(idToken.split(".")[1]));
        userEmail = payload.email || null;
      } catch {
        console.error("❌ Could not extract user email from ID token");
        return;
      }

      if (!userEmail) {
        console.error("❌ No user email found in token");
        return;
      }

      // Call refresh API
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken,
          email: userEmail,
        }),
      });

      if (response.ok) {
        await response.json(); // Consume response but don't store unused data
        console.log("✅ Tokens refreshed proactively");
        lastRefreshRef.current = Date.now();
      } else {
        console.error("❌ Failed to refresh tokens proactively");
      }
    } catch (error) {
      console.error("❌ Error during proactive token refresh:", error);
    }
  };

  useEffect(() => {
    // Set up proactive token refresh every 23 hours (before the 24-hour expiry)
    const REFRESH_INTERVAL = 23 * 60 * 60 * 1000; // 23 hours in milliseconds
    
    // Initial refresh check
    refreshTokensProactively();
    
    // Set up interval for periodic refresh
    refreshIntervalRef.current = setInterval(refreshTokensProactively, REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Also refresh tokens when the page becomes visible (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && Date.now() - lastRefreshRef.current > 60 * 60 * 1000) {
        // If page becomes visible and it's been more than 1 hour since last refresh
        console.log("🔄 Page became visible, checking token status...");
        refreshTokensProactively();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // This component doesn't render anything, it just manages token refresh
  return <>{children}</>;
}
