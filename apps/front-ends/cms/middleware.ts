import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "./lib/sessions/cookies";
import { getCurrentUserServer } from "./lib/sessions/server";

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

// Routes that are accessible to disabled users
const DISABLED_USER_ROUTES = [
  "/disabled", // Disabled user page
  "/api/auth/signout" // Allow signout
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

// Helper function to check if path is accessible to disabled users
function isDisabledUserRoute(pathname: string): boolean {
  return DISABLED_USER_ROUTES.some(route => pathname.startsWith(route));
}

// Helper function to check if path is an auth page
function isAuthPage(pathname: string): boolean {
  return ["/login", "/signup", "/forgot-password", "/reset-password"].includes(pathname);
}

// Helper function to check if user is disabled
async function isUserDisabled(): Promise<boolean> {
  try {
    const user = await getCurrentUserServer();
    // Check if user has a disabled flag in their session data
    // This assumes the session includes user status information
    return user?.disabled === true;
  } catch {
    // Silent fail for production - don't expose internal errors
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and UI test page
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname === "/ui-test") {
    return NextResponse.next();
  }

  // Check authentication once (simple cookie check for now)
  const authenticated = await isAuthenticated();

  // If not authenticated and not on public routes, redirect to login
  if (!authenticated && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If not authenticated, allow public routes
  if (!authenticated) {
    return NextResponse.next();
  }

  // User is authenticated from here on

  // For authenticated users on auth pages, always redirect to dashboard
  if (isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check if user is disabled
  const userDisabled = await isUserDisabled();

  if (userDisabled) {
    // If user is disabled and not on disabled user routes, redirect to disabled page
    if (!isDisabledUserRoute(pathname)) {
      return NextResponse.redirect(new URL("/disabled", request.url));
    }
    // Allow disabled users to access disabled user routes
    return NextResponse.next();
  } else {
    // If enabled user is on disabled page, redirect to dashboard
    if (pathname === "/disabled") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

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
