import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

const globalDatabase = globalThis as typeof globalThis & { clinicDatabase?: PrismaClient };
const connectionString = process.env.DATABASE_URL?.trim();

class ClinicDatabaseAdapter extends PrismaPg {
  override connect() {
    if (!connectionString) throw new Error("DATABASE_URL is required to connect to the clinic database.");
    return super.connect();
  }
}

export const db = globalDatabase.clinicDatabase ?? new PrismaClient({
  adapter: new ClinicDatabaseAdapter({
    connectionString,
    connectionTimeoutMillis: 2500,
    idleTimeoutMillis: 10_000,
    max: 3,
  }),
});
if (process.env.NODE_ENV !== "production") globalDatabase.clinicDatabase = db;

export function withScheduleLock<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  return db.$transaction(
    async (tx) => {
      // All schedule writers acquire this clinic-wide lock before reading settings or bookings.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(824749261)`;
      return operation(tx);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
