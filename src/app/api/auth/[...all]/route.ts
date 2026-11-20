import { getAuth } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { hasTrustedOrigin } from "@/lib/origin";
import { enforceRateLimit, rateLimitPolicy, readSmallJson } from "@/lib/security";
import { z } from "zod";

export const runtime = "nodejs";
const loginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (pathname !== "/api/auth/sign-in/email" && pathname !== "/api/auth/sign-out") {
    return Response.json({ message: "Not found." }, { status: 404 });
  }
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ message: "Invalid origin." }, { status: 403 });
    if (pathname === "/api/auth/sign-in/email") {
      await enforceRateLimit(request, "login");
      const input = loginInput.safeParse(await readSmallJson(request));
      if (!input.success) throw new DomainError("Enter a valid email and password.");
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      const validatedRequest = new Request(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...input.data, rememberMe: false }),
      });
      const response = await getAuth().handler(validatedRequest);
      await response.body?.cancel().catch(() => undefined);
      const status = response.status >= 500 ? 503 : response.status;
      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete("content-length");
      responseHeaders.set("cache-control", "no-store");
      // Keep Better Auth's Set-Cookie headers without returning the raw session token to JavaScript.
      return Response.json(response.ok ? { success: true } : {
        message: status === 503 ? "Sign-in is temporarily unavailable." : "Unable to sign in with those credentials.",
      }, { status, headers: responseHeaders });
    }
    return await getAuth().handler(request);
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ message: error.message }, {
        status: error.status,
        headers: error.status === 429 ? { "Retry-After": String(rateLimitPolicy.login.seconds) } : undefined,
      });
    }
    return Response.json({ message: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
