import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "./lib/auth-cookies";
import { getUserDataFromJWT } from "./lib/auth-utils";

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
async function validateTenantAccess(pathname: string, userData: any, request: NextRequest): Promise<NextResponse | null> {
  // If user has no tenants, redirect to tenant creation
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

    // Skip validation for non-ID routes
    if (requestedTenantId !== "create" && requestedTenantId !== "page") {
      if (!userData.tenantIds.includes(requestedTenantId)) {
        // SECURITY: Reduced logging to prevent information disclosure
        console.warn(`Unauthorized tenant access blocked for user: ${userData.username}`);
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // If user has tenants but tries to access tenant creation, redirect to dashboard
  if (pathname.startsWith("/tenants/create")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Use your existing isAuthenticated function
  const authenticated = await isAuthenticated();

  // If not authenticated and not on public routes, redirect to login
  if (!authenticated && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated and on auth pages, redirect to dashboard
  if (authenticated && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // TENANT VALIDATION: Check if user has any tenants and validate tenant-specific access
  if (authenticated && (pathname.startsWith("/dashboard") || pathname.startsWith("/tenants"))) {
    try {
      const userData = await getUserDataFromJWT();
      const tenantValidationResult = await validateTenantAccess(pathname, userData, request);

      if (tenantValidationResult) {
        return tenantValidationResult;
      }
    } catch (error) {
      console.error("Tenant validation failed:", error);
      return NextResponse.redirect(new URL("/login", request.url));
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
