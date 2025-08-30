import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "./lib/sessions/cookies";

// Routes that don't require authentication
// Route groups (auth) and (public) are organizational only - they don't appear in URLs
const PUBLIC_ROUTES = [
  "/", // Home page
  "/login", // Actually accessible at /login (from (auth) folder)
  "/signup", // Actually accessible at /signup (from (auth) folder)
  "/forgot-password", // Actually accessible at /forgot-password (from (auth) folder)
  "/reset-password", // Actually accessible at /reset-password (from (auth) folder)
  "/verify-signup", // Direct route for signup verification
  "/auth/verify-email", // Email verification page
  "/auth/verify-signup", // Signup verification page (route group)
  "/auth/verify-invite", // Invite verification page
  "/auth/reset-password", // Password reset page
  "/set-password", // Set password page for invites
  "/ui-test" // From (public) folder
];

// Helper function to check if path is a public route
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(route);
  });
}

// Helper function to check if path is an auth page
function isAuthPage(pathname: string): boolean {
  return ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and UI test page
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/ui-test") {
    return NextResponse.next();
  }

  // Check if session cookie exists
  const hasSessionCookie = await isAuthenticated();

  // If no session cookie and not on public routes, redirect to login
  if (!hasSessionCookie && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If no session cookie, allow public routes
  if (!hasSessionCookie) {
    return NextResponse.next();
  }

  // User is authenticated from here on

  // For authenticated users on auth pages, redirect to dashboard
  if (isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow access to protected routes - backend will validate session
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
