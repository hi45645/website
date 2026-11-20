"use server";

import { requireAdmin } from "@/lib/auth";
import { findAppointments, searchSchema } from "./dashboard-data";

export async function searchAppointments(data: FormData) {
  await requireAdmin();
  const parsed = searchSchema.safeParse({
    query: data.get("query"),
    status: data.get("status"),
    page: data.get("page") ?? 1,
  });
  if (!parsed.success) return { error: "Check your search and try again." };
  try {
    return await findAppointments(parsed.data);
  } catch {
    return { error: "Search is temporarily unavailable." };
  }
}
