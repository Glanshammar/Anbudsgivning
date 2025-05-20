import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Function to check if JWT token is valid
const isTokenValid = (token: string) => {
  try {
    // Validate token (check signature, expiration date, etc.)
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export function middleware(request: NextRequest) {
  // Get token from cookies or auth header
  const token =
    request.cookies.get("token")?.value ||
    request.headers.get("Authorization")?.substring(7);

  // Check if the route is part of the dashboard
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  // If the route is part of the dashboard but no valid token exists, redirect to the login page
  if (isDashboardRoute) {
    if (!token || !isTokenValid(token)) {
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
  ],
};
