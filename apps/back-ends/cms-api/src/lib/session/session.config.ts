import { CookieOptions } from "express";

export interface SessionConfig {
  cookieName: string;
  cookieOptions: CookieOptions;
  ttlSeconds: number;
}

export function getSessionConfig(): SessionConfig {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.COOKIE_DOMAIN;
  const ttlSeconds = parseInt(process.env.SESSION_TTL_SECONDS || "86400", 10);
  
  return {
    cookieName: process.env.SESSION_COOKIE_NAME || "sid",
    ttlSeconds,
    cookieOptions: {
      httpOnly: true,
      secure: isProduction, // Only send over HTTPS in production
      sameSite: isProduction ? "strict" : "lax", // Strict in production for better security
      maxAge: ttlSeconds * 1000, // Convert to milliseconds
      path: "/",
      domain: cookieDomain, // Set domain if specified
    },
  };
}
