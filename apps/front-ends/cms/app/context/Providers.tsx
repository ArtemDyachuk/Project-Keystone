"use client";

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
    <>
      {children}
      <ToastProvider />
    </>
  );
}
