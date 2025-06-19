import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Check if the route is part of the dashboard
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  // For dashboard routes, verify authentication with backend
  if (isDashboardRoute) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status/api`, {
        method: "GET",
        headers: {
          // Forward cookies from the request
          Cookie: request.headers.get("cookie") || "",
        },
      });

      if (!response.ok) {
        // Not authenticated, redirect to login
        const redirectUrl = new URL("/login", request.url);
        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      // Network error or server down, redirect to login
      console.error("Auth check failed:", error);
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

// Ensure middleware only runs for relevant routes
export const config = {
  matcher: [
    // Match all dashboard routes
    "/dashboard/:path*",
    // Also check login/register for authenticated users
    "/login",
    "/register",
  ],
};
