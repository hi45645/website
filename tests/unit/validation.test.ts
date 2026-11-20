import { describe, expect, it } from "vitest";
import { appointmentInput, clinicDate } from "@/lib/validation";
import { appointment } from "../fixtures";

describe("clinic date", () => {
  it("rolls over at 18:30 UTC, including the Indian New Year boundary", () => {
    expect(clinicDate(new Date("2027-12-31T18:29:59.999Z"))).toBe("2027-12-31");
    expect(clinicDate(new Date("2027-12-31T18:30:00.000Z"))).toBe("2028-01-01");
  });
});

describe("appointment validation", () => {
  it("accepts the booking fields and a well-formed preferred window", () => {
    expect(appointmentInput.safeParse(appointment()).success).toBe(true);
  });

  it.each([
    { name: "" },
    { mobile: "invalid" },
    { date: "2025-02-29" },
    { timeWindow: "10:00-09:00" },
    { category: "OTHER" },
    { idempotencyKey: "not-a-uuid" },
  ])("rejects invalid field values %#", (overrides) => {
    expect(appointmentInput.safeParse(appointment(overrides)).success).toBe(false);
  });
});
