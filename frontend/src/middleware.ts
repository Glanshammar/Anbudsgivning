import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Configuration - set to true to use mock authentication
const USE_DUMMY = true;

/**
 * Next.js middleware for protecting dashboard routes with authentication
 * Runs on the Edge Runtime before pages are rendered
 */
export async function middleware(request: NextRequest) {
  // Check if the route is part of the dashboard that requires authentication
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  // For dashboard routes, verify authentication
  if (isDashboardRoute) {
    if (USE_DUMMY) {
      // Mock authentication check - look for stored user in request headers
      // In client-side we use localStorage, but in middleware we need a different approach
      // For simplicity, we'll allow all dashboard access when using mock mode
      // The actual auth check will happen client-side
      console.log("🎭 Middleware using mock auth - allowing dashboard access");
      return NextResponse.next();
    } else {
      // Real backend authentication
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      try {
        // Verify session by calling backend status endpoint
        const response = await fetch(`${API_BASE_URL}/api/status/api`, {
          method: "GET",
          headers: {
            // Forward cookies from the request to maintain session context
            Cookie: request.headers.get("cookie") || "",
          },
        });

        if (!response.ok) {
          // Not authenticated, redirect to login
          const redirectUrl = new URL("/login", request.url);
          return NextResponse.redirect(redirectUrl);
        }
      } catch (error) {
        // Network error or server down, redirect to login for safety
        console.error("Auth check failed:", error);
        const redirectUrl = new URL("/login", request.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return NextResponse.next();
}

// Ensure middleware only runs for relevant routes to optimize performance
export const config = {
  matcher: [
    // Match all dashboard routes
    "/dashboard/:path*",
    // Also check login/register for authenticated users (future enhancement)
    "/login",
    "/register",
  ],
};
