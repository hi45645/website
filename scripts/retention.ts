import "./load-env";
import type { Prisma } from "@prisma/client";
import { db, withScheduleLock } from "../src/lib/db";
import { getSettings } from "../src/lib/settings";
import { clinicDate } from "../src/lib/validation";

async function cleanup() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply")) {
    throw new Error("Use npm run db:retention or npm run db:retention -- --apply.");
  }
  const now = new Date();
  const { retentionDays } = await getSettings();
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
  const until = clinicDate(now);
  const expiredAppointments: Prisma.AppointmentWhereInput = {
    updatedAt: { lt: cutoff },
    OR: [{ status: { not: "CONFIRMED" } }, { scheduledDate: { lt: until } }],
  };
  if (!args.length) {
    const total = await db.appointment.count({ where: expiredAppointments });
    console.log(`Dry run: ${total} appointment(s) eligible for deletion. No data changed.`);
    return;
  }

  let deleted: number;
  let total = 0;
  do {
    deleted = await withScheduleLock(async (tx) => {
      const appointments = await tx.appointment.findMany({
        where: expiredAppointments,
        orderBy: { updatedAt: "asc" },
        select: { id: true },
        take: 250,
      });
      const result = await tx.appointment.deleteMany({
        where: { ...expiredAppointments, id: { in: appointments.map(({ id }) => id) } },
      });
      return result.count;
    });
    total += deleted;
  } while (deleted === 250);

  await db.$transaction([
    db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    db.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.verification.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.rateLimitBucket.deleteMany({ where: { expiresAt: { lte: now } } }),
  ]);
  console.log(`Deleted ${total} expired appointment(s) and cleaned up eligible audit and security records.`);
}

cleanup().catch(() => {
  console.error("Retention cleanup failed. Verify the configured database and retry.");
  process.exitCode = 1;
}).finally(() => db.$disconnect());
