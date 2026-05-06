import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public API routes that don't need auth
  const publicRoutes = ["/api/chat", "/api/health", "/api/route", "/api/rag/test", "/api/rag/embedding-test"];
  const publicPrefixes = [
    "/api/webhook/",        // OpenBSP + Meta WhatsApp webhooks (signed by provider)
    "/api/stripe/webhook",  // Stripe webhooks (signed by Stripe)
  ];

  const isPublic =
    publicRoutes.includes(pathname) ||
    publicPrefixes.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  // /api/seed has special protection via x-seed-secret header
  if (pathname === "/api/seed" || pathname.startsWith("/api/seed/")) {
    const seedSecret = request.headers.get("x-seed-secret");
    if (
      process.env.NODE_ENV === "production" &&
      seedSecret !== process.env.SEED_SECRET
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Admin API key check for all other /api/* routes
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) return NextResponse.next(); // No key configured = open (dev mode)

  const authHeader = request.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${adminKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
