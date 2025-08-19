import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "./lib/sessions/cookies";
import { getCurrentUser } from "./lib/sessions/utils";

// Routes that don't require authentication
// Route groups (auth) and (public) are organizational only - they don't appear in URLs
const PUBLIC_ROUTES = [
  "/", // Home page
  "/login", // Actually accessible at /login (from (auth) folder)
  "/signup", // Actually accessible at /signup (from (auth) folder)
  "/forgot-password", // Actually accessible at /forgot-password (from (auth) folder)
  "/reset-password", // Actually accessible at /reset-password (from (auth) folder)
  "/auth/verify-email", // Email verification page
  "/auth/reset-password", // Password reset page
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

// Helper function to validate tenant access
async function validateTenantAccess(pathname: string, userData: any, request: NextRequest): Promise<NextResponse | null> {
  // For now, skip tenant validation since we're focusing on basic auth
  // This will be implemented later with proper tenant management
  console.log('🔄 Tenant validation skipped for now:', { pathname, userId: userData?.uid });
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Check authentication once (simple cookie check for now)
  const authenticated = await isAuthenticated();
  
  console.log('🔍 Middleware check:', { pathname, authenticated });

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

  // USER DATA VALIDATION: Temporarily disabled to fix redirect loop
  // TODO: Re-enable after fixing session validation
  /*
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/tenants")) {
    let userData;

    try {
      userData = await getCurrentUser();

      if (!userData) {
        console.error("Authenticated user but no session data available");
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } catch (error) {
      console.error("Failed to get user data:", error);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const tenantValidationResult = await validateTenantAccess(pathname, userData, request);

    if (tenantValidationResult) {
      return tenantValidationResult;
    }
  }
  */

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
