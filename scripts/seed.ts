import "./load-env";
import { createAppointment } from "../src/lib/appointments";
import { db } from "../src/lib/db";
import { clinicDate } from "../src/lib/validation";

async function seed() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1", "[::1]", "db"].includes(url.hostname) || !/_(?:local|test)$/.test(url.pathname)) {
    throw new Error("Development database required.");
  }
  delete process.env.RESEND_API_KEY;

  const existing = await db.appointment.findUnique({
    where: { idempotencyKey: "3c903559-74b0-4692-a0be-fdff35743dff" },
    select: { id: true },
  });
  if (!existing) {
    const tomorrow = new Date(Date.now() + 86_400_000);
    await createAppointment({
      name: "Synthetic Example",
      mobile: "+12025550123",
      date: clinicDate(tomorrow),
      timeWindow: "10:00-12:00",
      category: "SKIN",
      idempotencyKey: "3c903559-74b0-4692-a0be-fdff35743dff",
    });
  }
  console.log("Development seed complete.");
}

seed().catch(() => {
  console.error("Seed failed. Use a migrated local PostgreSQL database ending in _local or _test.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
