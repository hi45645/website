"use server";

import { revalidatePath } from "next/cache";
import { changeAppointment } from "@/lib/appointments";
import { requireAdmin } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { z } from "zod";
import type { MutationState } from "../../../mutation-form";

const actionSchema = z.enum(["CONFIRMED", "RESCHEDULE", "CANCELLED", "COMPLETED", "NO_SHOW", "NOTES"]);

export async function updateAppointment(id: string, _previous: MutationState, form: FormData): Promise<MutationState> {
  const admin = await requireAdmin();
  const parsed = actionSchema.safeParse(form.get("operation"));
  if (!parsed.success) return { error: "Choose an appointment action." };

  const operation = parsed.data;
  try {
    if (operation === "NOTES") {
      await changeAppointment(admin.id, { id, notes: String(form.get("notes") ?? "") });
    } else if (operation === "CONFIRMED" || operation === "RESCHEDULE") {
      await changeAppointment(admin.id, {
        id,
        status: "CONFIRMED",
        expectedStatus: operation === "CONFIRMED" ? "PENDING" : "CONFIRMED",
        scheduledDate: String(form.get("scheduledDate") ?? ""),
        scheduledTime: String(form.get("scheduledTime") ?? ""),
      });
    } else {
      await changeAppointment(admin.id, { id, status: operation });
    }
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    if (error instanceof z.ZodError) return { error: "Check the appointment details and try again." };
    return { error: "The appointment could not be updated. Please try again." };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/appointments/${id}`);
  return { success: "Appointment updated." };
}
