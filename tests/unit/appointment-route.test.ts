import { expect, it, vi } from "vitest";
import { POST } from "@/app/api/appointments/route";
import { enforceRateLimit } from "@/lib/security";
import { appointment } from "../fixtures";

vi.mock("@/lib/security", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/security")>()),
  enforceRateLimit: vi.fn(),
}));

it("returns a generic response when a database-backed prerequisite is unavailable", async () => {
  const origin = "http://127.0.0.1:3417";
  vi.stubEnv("APP_URL", origin);
  vi.mocked(enforceRateLimit).mockRejectedValueOnce(new Error("sensitive database internals"));
  try {
    const response = await POST(new Request(`${origin}/api/appointments`, {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(appointment()),
    }));
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).not.toContain("sensitive database internals");
    expect(body).not.toContain("Synthetic Test Patient");
  } finally {
    vi.unstubAllEnvs();
  }
});
