"use client";

import { StytchB2BProvider } from "@stytch/nextjs/b2b";
import { stytchClient } from "@/lib/auth/stytch-config";
import { ToastProvider } from './ToastProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Central providers composition component.
 * This component wraps all global providers that should be available throughout the app.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <StytchB2BProvider stytch={stytchClient}>
      {children}
      <ToastProvider />
    </StytchB2BProvider>
  );
}
