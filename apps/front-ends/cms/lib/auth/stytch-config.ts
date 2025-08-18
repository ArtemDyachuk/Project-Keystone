import { createStytchB2BUIClient } from "@stytch/nextjs/b2b/ui";

// Create Stytch B2B UI client using the public token
const token = process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN;

const stytchOptions = {
  cookieOptions: {
    opaqueTokenCookieName: "stytch_session",
    // jwtCookieName: "stytch_session_jwt",
    path: "",
    availableToSubdomains: false,
    domain: "",
  }
}

export const stytchClient = createStytchB2BUIClient(
  token!,
  stytchOptions
);
