"use client";

import { ToastProvider } from './ToastProvider';
import { AuthProvider } from './AuthContext';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Central providers composition component.
 * This component wraps all global providers that should be available throughout the app.
 * Note: Stytch authentication is now handled server-side via API routes.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      {children}
      <ToastProvider />
    </AuthProvider>
  );
}
