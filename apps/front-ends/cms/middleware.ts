import { NextRequest, NextResponse } from "next/server";

// Client-safe interfaces and functions for Edge Runtime
interface UserData {
  sub: string;
  email?: string;
  username?: string;
  email_verified?: boolean;
  firstName?: string;
  lastName?: string;
  tenantIds?: string[];
  selectedTenantId?: string;
  tenantRoles?: Record<string, string>;
}

/**
 * Decode JWT token without verification (client-safe)
 * Note: This does not verify the signature, use only for non-critical operations
 */
function decodeJwtToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    throw new Error(`JWT decode failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Extract user data from JWT token (client-safe)
 */
function getUserDataFromJWT(token: string): UserData | null {
  try {
    const decoded = decodeJwtToken(token);

    if (!decoded) {
      return null;
    }

    // Parse custom attributes properly - Firebase custom claims are directly accessible
    const decodedWithClaims = decoded as any;
    const tenantIds = decodedWithClaims.tenantIds || [];
    const selectedTenantId = decodedWithClaims.selectedTenantId;
    const tenantRoles = decodedWithClaims.tenantRoles || {};

    return {
      sub: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      email_verified: decoded.email_verified,
      firstName: decoded.given_name,
      lastName: decoded.family_name,
      tenantIds: tenantIds,
      selectedTenantId: selectedTenantId,
      tenantRoles: tenantRoles,
    };
  } catch (error) {
    console.error("Failed to extract user data from JWT:", error);
    return null;
  }
}

// Routes that don't require authentication
// Route groups (auth) and (public) are organizational only - they don't appear in URLs
const PUBLIC_ROUTES = [
  "/", // Home page
  "/login", // Actually accessible at /login (from (auth) folder)
  "/signup", // Actually accessible at /signup (from (auth) folder)
  "/forgot-password", // Actually accessible at /forgot-password (from (auth) folder)
  "/reset-password", // Actually accessible at /reset-password (from (auth) folder)
  "/ui-test", // From (public) folder 
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

// Helper function to check if user is authenticated (client-safe)
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    // Check for auth cookies instead of Authorization header
    const accessToken = request.cookies.get("accessToken")?.value;
    const idToken = request.cookies.get("idToken")?.value;
    
    if (!accessToken && !idToken) {
      return false;
    }

    // Use ID token if available, otherwise fall back to access token
    const token = idToken || accessToken;
    
    // Try to decode the JWT to check if it's valid
    const userData = getUserDataFromJWT(token!);
    return userData !== null;
  } catch (error) {
    console.error("Authentication check error:", error);
    return false;
  }
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
        console.warn(`🚨 Unauthorized tenant access attempt blocked`, {
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
  const authenticated = await isAuthenticated(request);

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
      // Get user data from cookies instead of authorization header
      const accessToken = request.cookies.get("accessToken")?.value;
      const idToken = request.cookies.get("idToken")?.value;
      
      if (!accessToken && !idToken) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      const token = idToken || accessToken;
      userData = getUserDataFromJWT(token!);

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
