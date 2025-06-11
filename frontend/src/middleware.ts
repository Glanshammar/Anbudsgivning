import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TEMPORARY DEBUG MODE - Set to true to bypass authentication
const DEBUG_BYPASS_AUTH = true; // Change this to false when Firebase is fixed

export function middleware(request: NextRequest) {
  // TEMPORARY: Bypass all auth checks if debug mode is enabled
  if (DEBUG_BYPASS_AUTH) {
    console.log("🚨 DEBUG MODE: Authentication bypassed");
    return NextResponse.next();
  }

  // Get session cookie from flask-login (typically named 'session')
  const sessionCookie = request.cookies.get("session")?.value;

  // Check if the route is part of the dashboard
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  // If the route is part of the dashboard but no session exists, redirect to the login page
  if (isDashboardRoute) {
    if (!sessionCookie) {
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // If user has a session and trying to access login/register, redirect to dashboard
  if (sessionCookie) {
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
