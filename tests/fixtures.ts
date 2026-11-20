import { randomUUID } from "node:crypto";

export function dateAhead(days: number, now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })
    .format(new Date(now + days * 86_400_000));
}

export function appointment(overrides: Record<string, unknown> = {}) {
  return {
    name: "Synthetic Test Patient",
    mobile: "+919000000001",
    date: dateAhead(10),
    timeWindow: "09:00-10:00",
    category: "SKIN",
    idempotencyKey: randomUUID(),
    website: "",
    ...overrides,
  };
}
