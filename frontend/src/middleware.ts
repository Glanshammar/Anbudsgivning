import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Function to check if JWT token is valid
const isTokenValid = (token: string): boolean => {
  try {
    // Basic JWT validation (check if it has 3 parts and isn't expired)
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export function middleware(request: NextRequest) {
  // Get access token from HTTP-only cookie (set by backend)
  const accessToken = request.cookies.get("access_token")?.value;

  // Check if the route is part of the dashboard
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  // If the route is part of the dashboard but no valid token exists, redirect to the login page
  if (isDashboardRoute) {
    if (!accessToken || !isTokenValid(accessToken)) {
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If user is authenticated and trying to access login/register, redirect to dashboard
  if (accessToken && isTokenValid(accessToken)) {
    if (
      request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/register"
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
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
