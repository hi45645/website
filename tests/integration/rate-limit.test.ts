import { createHmac, randomInt } from "node:crypto";
import { expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { authSecret, enforceRateLimit, rateLimitPolicy } from "@/lib/security";
import { POST as signIn } from "@/app/api/auth/[...all]/route";

const request = new Request("http://127.0.0.1:3417/api/appointments");

it("throttles shared appointment traffic and does not trust client-supplied forwarded headers locally", async () => {
  const { limit, seconds } = rateLimitPolicy.appointment;
  const time = Date.now() - randomInt(1000, 6000) * seconds * 1000;
  const window = Math.floor(time / (seconds * 1000));
  const key = createHmac("sha256", authSecret()).update(`appointment:${window}:local`).digest("hex");
  vi.stubEnv("VERCEL", "0");
  try {
    const withinLimit = await Promise.allSettled(Array.from({ length: limit }, () =>
      enforceRateLimit(request, "appointment", time),
    ));
    expect(withinLimit.every(({ status }) => status === "fulfilled")).toBe(true);
    const forged = new Request(request.url, { headers: {
      "x-forwarded-for": "198.51.100.45",
      "x-vercel-forwarded-for": "198.51.100.46",
    } });
    await expect(enforceRateLimit(forged, "appointment", time)).rejects.toHaveProperty("status", 429);
    const bucket = await db.rateLimitBucket.findUniqueOrThrow({ where: { key } });
    expect(bucket.count).toBe(limit + 1);
  } finally {
    vi.unstubAllEnvs();
    await db.rateLimitBucket.deleteMany({ where: { key } });
    await db.$disconnect();
  }
});

it("limits login separately in the database", async () => {
  const { limit, seconds } = rateLimitPolicy.login;
  const now = 1_849_000_000_000;
  const width = seconds * 1000;
  const window = Math.floor(now / width);
  const key = createHmac("sha256", authSecret()).update(`login:${window}:local`).digest("hex");
  vi.spyOn(Date, "now").mockReturnValue(now);
  vi.stubEnv("VERCEL", "0");
  try {
    await Promise.all(Array.from({ length: limit }, () => enforceRateLimit(request, "login", now)));
    const response = await signIn(new Request("http://127.0.0.1:3417/api/auth/sign-in/email", {
      method: "POST",
      headers: { origin: "http://127.0.0.1:3417", "content-type": "application/json" },
      body: JSON.stringify({ email: "nobody@example.test", password: "synthetic-test-password" }),
    }));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe(String(seconds));
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await db.rateLimitBucket.deleteMany({ where: { key } });
    await db.$disconnect();
  }
});
