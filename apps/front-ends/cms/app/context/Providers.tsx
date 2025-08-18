"use client";

import { ToastProvider } from './ToastProvider';

import { StytchB2BProvider } from '@stytch/nextjs/b2b';
import { createStytchB2BUIClient } from '@stytch/nextjs/b2b/ui';

interface ProvidersProps {
  children: React.ReactNode;
}


// We initialize the Stytch client using our project's public token which can be found in the Stytch dashboard
const stytch = createStytchB2BUIClient(
  process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN || ''
);

// const stytchOptions = {
//   cookieOptions: {
//     opaqueTokenCookieName: "stytch_session",
//     // jwtCookieName: "stytch_session_jwt",
//     path: "",
//     availableToSubdomains: false,
//     domain: "",
//   }
// }

// const stytchClient = createStytchB2BUIClient(
//   process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN!,
//   stytchOptions
// );

/**
 * Central providers composition component.
 * This component wraps all global providers that should be available throughout the app.
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <StytchB2BProvider stytch={stytch}>
      {children}
      <ToastProvider />
    </StytchB2BProvider>
  );
}
