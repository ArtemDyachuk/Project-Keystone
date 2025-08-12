import { NextRequest, NextResponse } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  "/", // Home page
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password"
];

// Helper function to check if path is a public route
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("accessToken")?.value;
  const isAuthenticated = !!accessToken;

  // If not authenticated, only allow access to public routes
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If authenticated and on auth pages, redirect to home
  if (isAuthenticated && (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/reset-password")) {
    return NextResponse.redirect(new URL("/", request.url));
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
