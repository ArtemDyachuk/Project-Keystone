"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@keystone/ui";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Auth Error:", error);
  }, [error]);

  return (
    <div className="auth-error">
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h1 className="error-title">Something went wrong!</h1>
        <p className="error-message">
          We encountered an unexpected error. Please try again or contact support if the problem persists.
        </p>
        
        <div className="error-actions">
          <Button onClick={reset} className="retry-button">
            🔄 Try Again
          </Button>
          
          <Link href="/login">
            <Button variant="secondary" className="back-button">
              ← Back to Login
            </Button>
          </Link>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="error-details">
            <details>
              <summary>Error Details (Development Only)</summary>
              <pre className="error-stack">
                {error.message}
                {error.digest && `\nError ID: ${error.digest}`}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
