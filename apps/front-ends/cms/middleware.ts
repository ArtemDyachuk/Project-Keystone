import { NextRequest, NextResponse } from "next/server";
import { decodeJwtToken } from "@keystone/auth";

// Simple in-memory cache for JWT validation (in production, consider Redis)
const jwtCache = new Map<string, { tenantIds: string[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/", // Home page
  "/login",
  "/signup", 
  "/forgot-password",
  "/reset-password",
  "/ui-test"
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

// Get user's tenant IDs from JWT token with caching
function getUserTenantsFromJWT(request: NextRequest): string[] {
  try {
    const idToken = request.cookies.get("idToken")?.value;
    if (!idToken) return [];

    // Check cache first
    const cacheKey = idToken.substring(0, 50); // Use first 50 chars as cache key
    const cached = jwtCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.tenantIds;
    }

    // Decode JWT if not cached or expired
    const decoded = decodeJwtToken(idToken);
    const tenantIds = decoded["custom:tenantIds"];
    
    let result: string[] = [];
    if (typeof tenantIds === "string") {
      result = tenantIds.split(",").filter(Boolean);
    }
    
    // Cache the result
    jwtCache.set(cacheKey, {
      tenantIds: result,
      expiresAt: Date.now() + CACHE_TTL
    });
    
    return result;
  } catch (error) {
    console.error("Failed to decode JWT for tenant validation:", error);
    return [];
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  const isAuthenticated = !!accessToken;

  // If not authenticated and not on public routes, redirect to login
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated and on auth pages, redirect to dashboard
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // TENANT VALIDATION: Check if user has any tenants
  if (isAuthenticated && pathname.startsWith("/dashboard")) {
    const userTenants = getUserTenantsFromJWT(request);
    
    // If user has no tenants, redirect to tenant creation
    if (userTenants.length === 0) {
      return NextResponse.redirect(new URL("/tenants/create", request.url));
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
