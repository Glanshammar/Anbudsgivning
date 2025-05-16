import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Funktion för att kontrollera om JWT token är giltig
const isTokenValid = (token: string) => {
  try {
    // Validera token (kontrollera signatur, utgångsdatum osv.)
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export function middleware(request: NextRequest) {
  // Hämta token från cookies eller auth header
  const token =
    request.cookies.get("token")?.value ||
    request.headers.get("Authorization")?.substring(7);

  // Kontrollera om rutten är en del av dashboard
  const isDashboardRoute = request.nextUrl.pathname.startsWith("/dashboard");

  // Om det är en dashboard-rutt men ingen giltig token finns, omdirigera till inloggningssidan
  if (isDashboardRoute) {
    if (!token || !isTokenValid(token)) {
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

// Se till att middleware endast körs för relevanta rutter
export const config = {
  matcher: [
    // Matcha alla dashboard-rutter
    "/dashboard/:path*",
  ],
};
