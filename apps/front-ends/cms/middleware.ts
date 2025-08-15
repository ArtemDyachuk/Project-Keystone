import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "./lib/auth-cookies";
import { getUserDataFromJWT, UserData } from "./lib/auth-utils";

// Routes that don't require authentication
// Route groups (auth) and (public) are organizational only - they don't appear in URLs
const PUBLIC_ROUTES = [
  "/", // Home page
  "/login", // Actually accessible at /login (from (auth) folder)
  "/signup", // Actually accessible at /signup (from (auth) folder)
  "/forgot-password", // Actually accessible at /forgot-password (from (auth) folder)
  "/reset-password", // Actually accessible at /reset-password (from (auth) folder)
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
async function validateTenantAccess(pathname: string, userData: UserData, request: NextRequest): Promise<NextResponse | null> {
  // If user has no tenants, redirect to tenant creation (unless already there)
  if (!userData?.tenantIds || userData.tenantIds.length === 0) {
    if (!pathname.startsWith("/tenants/create")) {
      return NextResponse.redirect(new URL("/tenants/create", request.url));
    }
    return null;
  }

  // User has tenants - validate access to specific tenant routes
  const tenantIdMatch = pathname.match(/^\/tenants\/([^\/]+)(?:\/|$)/);
  if (tenantIdMatch) {
    const requestedTenantId = tenantIdMatch[1];

    // Skip validation for special routes and allow tenant management pages
    const allowedSpecialRoutes = ["create", "page"];
    if (!allowedSpecialRoutes.includes(requestedTenantId)) {
      // Validate that user has access to the specific tenant
      if (!userData.tenantIds.includes(requestedTenantId)) {
        // SECURITY: Log security violation but don't expose tenant IDs
        console.warn(`Unauthorized tenant access attempt blocked`, {
          userId: userData.sub,
          requestedPath: pathname,
          // Don't log the actual tenant ID for security
        });
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // Allow users to create additional tenants regardless of existing tenant count
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Check authentication once
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

  // TENANT VALIDATION: Only for protected routes that need tenant context
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/tenants")) {
    let userData: UserData | null;

    try {
      userData = await getUserDataFromJWT();

      // If we can't get user data but they're authenticated, something's wrong
      if (!userData) {
        console.error("Authenticated user but no JWT data available");
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
