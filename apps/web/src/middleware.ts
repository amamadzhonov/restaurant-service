import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hasAccessToken = Boolean(request.cookies.get("access_token")?.value);
  const hasRefreshToken = Boolean(request.cookies.get("refresh_token")?.value);

  if (hasAccessToken || hasRefreshToken) {
    return NextResponse.next();
  }

  const homeUrl = new URL("/", request.url);
  return NextResponse.redirect(homeUrl);
}

export const config = {
  matcher: ["/platform/:path*", "/admin/:path*", "/waiter/:path*", "/kitchen/:path*"],
};
