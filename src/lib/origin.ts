export function applicationOrigin(): string {
  const value = process.env.APP_URL ?? (
    process.env.VERCEL === "1" && process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV !== "production" ? "http://localhost:3000" : undefined
  );

  if (!value) throw new Error("APP_URL is required.");
  const parsed = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(parsed.protocol === "http:" && local && process.env.VERCEL !== "1")) ||
    parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("APP_URL must be an absolute HTTPS origin or a local HTTP origin.");
  }
  return parsed.origin;
}

export function hasTrustedOrigin(request: Request): boolean {
  return request.headers.get("origin") === applicationOrigin();
}
