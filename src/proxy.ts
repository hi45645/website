import { NextRequest, NextResponse } from "next/server";

function contentSecurityPolicy(nonce?: string) {
  const scripts = nonce ? `'self' 'nonce-${nonce}' 'strict-dynamic'` : "'self' 'unsafe-inline'";
  const development = process.env.NODE_ENV === "development";
  const developmentScripts = development ? " 'unsafe-eval'" : "";
  const developmentConnections = development ? " ws: wss:" : "";
  const styles = nonce && !development ? `'self' 'nonce-${nonce}'` : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scripts}${developmentScripts}`,
    "script-src-attr 'none'",
    `style-src ${styles}`,
    "font-src 'self'",
    "img-src 'self' data: blob:",
    `connect-src 'self'${developmentConnections}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const admin = pathname === "/admin" || pathname.startsWith("/admin/");
  const nonce = admin ? Buffer.from(crypto.randomUUID()).toString("base64") : undefined;
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  if (nonce) {
    // Next.js reads the forwarded CSP to apply the nonce to framework scripts.
    requestHeaders.set("Content-Security-Policy", policy);
  } else {
    requestHeaders.delete("Content-Security-Policy");
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);

  if (admin) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/((?!api/|_next/|.*\\.).*)"],
};
