import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/", // Home page
  "/login", // Login page
  "/signup", // Signup page
  "/forgot-password", // Forgot password page
  "/reset-password", // Reset password page
  "/ui-test" // UI test page
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

// Helper function to check if user has Stytch session
async function hasStytchSession(request: NextRequest): Promise<boolean> {
  try {
    // Check for Stytch opaque session cookie only
    // Using only opaque tokens for maximum security (no JWT in cookies)
    const stytchSession = request.cookies.get("stytch_session");
    
    // User is authenticated if opaque session cookie exists
    return !!stytchSession;
  } catch (error) {
    console.error("Failed to check Stytch session:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Check Stytch authentication
  const authenticated = await hasStytchSession(request);

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
  if (isAuthPage(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // For now, allow access to protected routes if authenticated
  // TODO: Add tenant validation when you implement multi-tenancy
  // This would involve checking the Stytch session for tenant information

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
