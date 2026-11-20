import { afterEach, expect, it, vi } from "vitest";
import { createAppointment } from "@/lib/appointments";
import { db } from "@/lib/db";
import { sendAppointmentNotification } from "@/lib/notifications";
import { appointment } from "../fixtures";

const fixtures = new Set<string>();

afterEach(async () => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await db.appointment.deleteMany({ where: { idempotencyKey: { in: [...fixtures] } } });
  fixtures.clear();
  await db.$disconnect();
});

async function createFixture() {
  const input = appointment();
  fixtures.add(input.idempotencyKey);
  return (await createAppointment(input)).appointment;
}

it("preserves a request and records NOT_CONFIGURED without sending an alert", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const record = await createFixture();
  await sendAppointmentNotification(record.id);
  const saved = await db.appointment.findUniqueOrThrow({ where: { id: record.id } });
  expect(saved).toMatchObject({ status: "PENDING", notificationStatus: "NOT_CONFIGURED" });
  expect(fetch).not.toHaveBeenCalled();
});

it("preserves the request if a provider rejects delivery and sends no patient information", async () => {
  vi.stubEnv("RESEND_API_KEY", "synthetic-email-test-only");
  vi.stubEnv("NOTIFICATION_FROM", "notifications@example.test");
  vi.stubEnv("NOTIFICATION_TO", "staff@example.test");
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
  vi.stubGlobal("fetch", fetch);
  const record = await createFixture();
  await sendAppointmentNotification(record.id);
  const saved = await db.appointment.findUniqueOrThrow({ where: { id: record.id } });
  expect(saved).toMatchObject({ status: "PENDING", notificationStatus: "FAILED" });
  expect(fetch).toHaveBeenCalledOnce();
  const body = String(fetch.mock.calls[0][1].body);
  for (const patientField of [record.mobile, record.name, record.reference]) {
    expect(body).not.toContain(patientField);
  }
});
