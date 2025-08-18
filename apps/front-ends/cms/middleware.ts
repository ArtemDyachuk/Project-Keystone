import { NextRequest, NextResponse } from "next/server";

// Note: UserData interface removed since we no longer decode JWT tokens in middleware
// User data and tenant validation now happens on the backend

// Note: JWT decoding functions removed since we now use session cookies
// Detailed user data and tenant validation happens on the backend

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
    // Check for session cookie instead of JWT tokens
    const sessionCookie = request.cookies.get("fb_session")?.value;
    
    if (!sessionCookie) {
      return false;
    }

    // For now, just check if the session cookie exists
    // In the future, we could add basic validation here
    // Note: Full verification happens on the backend with Firebase Admin SDK
    return true;
  } catch (error) {
    console.error("Authentication check error:", error);
    return false;
  }
}

// Note: Tenant access validation removed from middleware
// This will now be handled by the backend with Firebase Admin SDK

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

  // For authenticated users on auth pages, redirect to dashboard
  // Exception: Allow access to login page if tenantId is provided (for GIP tenant switching)
  if (isAuthPage(pathname)) {
    const url = request.nextUrl;
    const tenantId = url.searchParams.get("tenantId");
    
    // Allow login page access for GIP tenant switching
    if (pathname === "/login" && tenantId) {
      console.log(`🔐 Allowing login access for GIP tenant switch: ${tenantId}`);
      return NextResponse.next();
    }
    
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // TENANT VALIDATION: Only for protected routes that need tenant context
  // Note: Since we're using session cookies, detailed tenant validation
  // will happen on the backend with Firebase Admin SDK
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/tenants")) {
    // For now, just check if user is authenticated
    // The backend will handle tenant-specific validation
    // This prevents the middleware from blocking valid requests
    return NextResponse.next();
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
