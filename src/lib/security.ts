import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { db } from "./db";
import { DomainError } from "./errors";

export function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET requires at least 32 characters.");
  return secret;
}

function rateLimitClient(request: Request) {
  if (process.env.VERCEL !== "1") return "local";
  const forwarded = request.headers.get("x-vercel-forwarded-for")?.trim() ?? "";
  return isIP(forwarded) ? forwarded : "unknown";
}

export const rateLimitPolicy = {
  appointment: { limit: 8, seconds: 900 },
  login: { limit: 10, seconds: 900 },
} as const;

export async function enforceRateLimit(request: Request, scope: keyof typeof rateLimitPolicy, now = Date.now()) {
  const { limit, seconds } = rateLimitPolicy[scope];
  const width = seconds * 1000;
  const window = Math.floor(now / width);
  const key = createHmac("sha256", authSecret())
    .update(`${scope}:${window}:${rateLimitClient(request)}`)
    .digest("hex");

  const row = await db.rateLimitBucket.upsert({
    where: { key },
    create: { key, count: 1, expiresAt: new Date((window + 1) * width) },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  if (row.count > limit) throw new DomainError("Too many attempts. Try again in a few minutes.", 429);
}

export async function readSmallJson(request: Request, maxBytes = 4096): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    throw new DomainError("Send the form as JSON.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader) throw new DomainError("Send a valid form.");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new DomainError("The submission is too large.", 413);
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return JSON.parse(text) as unknown;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof DomainError) throw error;
    throw new DomainError("Send a valid form.");
  } finally {
    reader.releaseLock();
  }
}
