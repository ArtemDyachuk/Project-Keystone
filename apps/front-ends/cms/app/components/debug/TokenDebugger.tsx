"use client";

import { useState } from "react";
import styles from "./TokenDebugger.module.css";

interface TokenInfo {
  userData: {
    sub?: string;
    email?: string;
    username?: string;
    tenantIds?: string[];
    selectedTenantId?: string;
  };
  tokenInfo: {
    accessTokenExpiry?: string;
    idTokenExpiry?: string;
    accessTokenTenantIds?: string;
    idTokenTenantIds?: string;
    accessTokenSelectedTenant?: string;
    idTokenSelectedTenant?: string;
  };
}

export function TokenDebugger() {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const debugTokens = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug/user-tokens");
      const data = await response.json();
      setTokenInfo(data);
    } catch (error) {
      console.error("Failed to debug tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/auth/force-refresh", {
        method: "POST",
      });
      const result = await response.json();
      
      if (response.ok) {
        console.log("✅ Token refresh successful:", result);
        // Refresh the debug info
        await debugTokens();
        // Reload the page to pick up new tokens
        window.location.reload();
      } else {
        console.error("❌ Token refresh failed:", result);
      }
    } catch (error) {
      console.error("❌ Token refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3>🔍 Token Debugger</h3>
      <p>Use this to diagnose production token issues</p>
      
      <div className={styles.buttons}>
        <button onClick={debugTokens} disabled={loading} className={styles.button}>
          {loading ? "Loading..." : "🔍 Debug Tokens"}
        </button>
        <button onClick={forceRefresh} disabled={refreshing} className={styles.button}>
          {refreshing ? "Refreshing..." : "🔄 Force Refresh"}
        </button>
      </div>

      {tokenInfo && (
        <div className={styles.info}>
          <div className={styles.section}>
            <h4>👤 User Data</h4>
            <pre>{JSON.stringify(tokenInfo.userData, null, 2)}</pre>
          </div>
          
          <div className={styles.section}>
            <h4>🎫 Token Info</h4>
            <pre>{JSON.stringify(tokenInfo.tokenInfo, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
