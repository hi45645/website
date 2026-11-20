"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { DomainError } from "@/lib/errors";
import { saveSettings } from "@/lib/settings";
import { z } from "zod";
import type { MutationState } from "../../mutation-form";

const hourWindow = z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/);

export async function updateSettings(_previous: MutationState, form: FormData): Promise<MutationState> {
  const admin = await requireAdmin();
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const fields = Array.from({ length: 7 }, (_, day) => ({ day, value: text(`hours-${day}`) }));
  if (fields.some(({ value }) => value.length > 120)) return { error: "Check the working hours and try again." };

  const workingHours = [];
  for (const { day, value } of fields) {
    for (const interval of value.split(",").map((item) => item.trim()).filter(Boolean)) {
      if (!hourWindow.safeParse(interval).success) return { error: "Enter working hours in HH:MM-HH:MM format." };
      const [start, end] = interval.split("-");
      workingHours.push({ day, start, end });
    }
  }
  try {
    await saveSettings(admin.id, {
      workingHours,
      blockedDates: text("blockedDates").split(/[\s,]+/).filter(Boolean),
      slotDuration: Number(text("slotDuration")),
      capacity: Number(text("capacity")),
      retentionDays: Number(text("retentionDays")),
      phone: text("phone"),
      address: text("address"),
      homeIntro: text("homeIntro"),
      about: text("about"),
      skinCare: text("skinCare"),
      diabetesCare: text("diabetesCare"),
      privacyContact: text("privacyContact"),
    });
  } catch (error) {
    if (error instanceof DomainError) return { error: error.message };
    if (error instanceof z.ZodError) return { error: "Check the settings and try again." };
    return { error: "Settings could not be saved. Please try again." };
  }
  revalidatePath("/", "layout");
  return { success: "Settings saved." };
}
