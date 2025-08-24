"use client";

import { ToastProvider } from './ToastProvider';

/**
 * Central providers composition component.
 * This component wraps all global providers that should be available throughout the app.
 */
export function Providers({ children }: React.PropsWithChildren) {
  return (
    <>
      {children}
      <ToastProvider />
    </>
  );
}
