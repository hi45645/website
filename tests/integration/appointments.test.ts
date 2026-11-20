import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { changeAppointment, createAppointment } from "@/lib/appointments";
import { db } from "@/lib/db";
import { getSettings, saveSettings } from "@/lib/settings";
import { appointment, dateAhead } from "../fixtures";

const actor = "synthetic-integration-owner";
const date = dateAhead(7);
const blockedDate = dateAhead(8);
const appointmentKeys = new Set<string>();
let previousSettings: Awaited<ReturnType<typeof getSettings>> | undefined;

function booking(overrides: Parameters<typeof appointment>[0] = {}) {
  const input = appointment({ date, ...overrides });
  appointmentKeys.add(input.idempotencyKey);
  return input;
}

async function storedRecord(idempotencyKey: string) {
  return db.appointment.findUniqueOrThrow({ where: { idempotencyKey } });
}

describe("PostgreSQL appointment management", () => {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();

  beforeAll(async () => {
    const initial = await getSettings();
    if (await db.clinicSettings.count({ where: { id: 1 } })) previousSettings = initial;
    const publicContent = {
      phone: initial.phone,
      address: initial.address,
      homeIntro: initial.homeIntro,
      about: initial.about,
      skinCare: initial.skinCare,
      diabetesCare: initial.diabetesCare,
      privacyContact: initial.privacyContact,
    };
    await saveSettings(actor, {
      ...publicContent,
      workingHours: [{ day, start: "09:00", end: "10:30" }],
      blockedDates: [blockedDate],
      slotDuration: 30,
      capacity: 1,
      retentionDays: 30,
    });
  });

  afterAll(async () => {
    await db.appointment.deleteMany({ where: { idempotencyKey: { in: [...appointmentKeys] } } });
    if (previousSettings) {
      await saveSettings(actor, previousSettings);
    } else {
      await db.clinicSettings.deleteMany({ where: { id: 1 } });
    }
    await db.auditLog.deleteMany({ where: { actorId: actor } });
    await db.$disconnect();
  });

  it("inserts one pending row for concurrent identical submissions", async () => {
    const input = booking();
    await Promise.all([createAppointment(input), createAppointment(input)]);
    const stored = await storedRecord(input.idempotencyKey);
    expect(stored).toMatchObject({
      status: "PENDING",
      preferredDate: date,
      timeWindow: input.timeWindow,
      mobile: input.mobile,
      scheduledDate: null,
      scheduledTime: null,
    });
    expect(stored.reference.length).toBeGreaterThanOrEqual(16);
    expect(await db.appointment.count({ where: { idempotencyKey: input.idempotencyKey } })).toBe(1);
  });

  it("serializes concurrent confirmations, enforces schedule constraints, and releases capacity", async () => {
    const inputs = [booking(), booking({ mobile: "+919000000021" })];
    await Promise.all(inputs.map((input) => createAppointment(input)));
    const rows = await Promise.all(inputs.map((input) => storedRecord(input.idempotencyKey)));
    const attempts = await Promise.allSettled(rows.map((row) =>
      changeAppointment(actor, { id: row.id, status: "CONFIRMED", scheduledDate: date, scheduledTime: "09:00" }),
    ));
    expect(attempts.map((attempt) => attempt.status).sort()).toEqual(["fulfilled", "rejected"]);

    const confirmed = rows[attempts.findIndex((attempt) => attempt.status === "fulfilled")];
    const pending = rows[attempts.findIndex((attempt) => attempt.status === "rejected")];
    expect((await storedRecord(pending.idempotencyKey)).status).toBe("PENDING");
    await expect(changeAppointment(actor, { id: pending.id, status: "COMPLETED" })).rejects.toThrow();
    await expect(changeAppointment(actor, {
      id: pending.id, status: "CONFIRMED", scheduledDate: blockedDate, scheduledTime: "09:30",
    })).rejects.toThrow();
    await expect(changeAppointment(actor, {
      id: pending.id, status: "CONFIRMED", scheduledDate: date, scheduledTime: "08:00",
    })).rejects.toThrow();
    await expect(changeAppointment(actor, {
      id: pending.id, status: "CONFIRMED", scheduledDate: date, scheduledTime: "09:20",
    })).rejects.toThrow();

    await changeAppointment(actor, {
      id: confirmed.id, scheduledDate: date, scheduledTime: "09:30", notes: "Synthetic admin note",
    });
    await changeAppointment(actor, {
      id: pending.id, status: "CONFIRMED", scheduledDate: date, scheduledTime: "09:00",
    });
    const rescheduled = await storedRecord(confirmed.idempotencyKey);
    expect(rescheduled).toMatchObject({
      status: "CONFIRMED",
      scheduledDate: date,
      scheduledTime: "09:30",
      notes: "Synthetic admin note",
    });
    await changeAppointment(actor, { id: confirmed.id, status: "CANCELLED" });
    await expect(changeAppointment(actor, { id: confirmed.id, status: "COMPLETED" })).rejects.toThrow();
    expect(await db.auditLog.count({ where: { actorId: actor, appointmentId: confirmed.id } })).toBeGreaterThanOrEqual(3);
  });
});
