import "server-only";
import { db } from "@/lib/db";
import { z } from "zod";
import { statuses } from "./admin-format";

export const searchSchema = z.object({
  query: z.string().trim().max(120),
  status: z.union([z.enum(statuses), z.literal("")]),
  page: z.coerce.number().int().min(1).max(100000),
});

export async function findAppointments({ query, status, page }: z.infer<typeof searchSchema>) {
  const pageSize = 30;
  const where = {
    ...(status && { status }),
    ...(query && {
      OR: [
        { name: { contains: query, mode: "insensitive" as const } },
        { mobile: { contains: query } },
        { reference: { equals: query, mode: "insensitive" as const } },
      ],
    }),
  };
  const rows = await db.appointment.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
    select: { id: true, reference: true, name: true, preferredDate: true, status: true, category: true },
  });
  return { rows: rows.slice(0, pageSize), hasNext: rows.length > pageSize, page, query, status, error: "" };
}
