import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextAuthRequest } from "next-auth";

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/api/cron/")) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!session && (pathname.startsWith("/reports") || pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session?.user?.role !== "ADMIN" && pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (session?.user?.role !== "ADMIN" && pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/reports", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/reports/:path*", "/admin/:path*", "/api/admin/:path*", "/api/cron/:path*"],
};
