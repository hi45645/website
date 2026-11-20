import type { ClinicSettings, Prisma } from "@prisma/client";
import { db, withScheduleLock } from "./db";
import { DomainError } from "./errors";
import { clinicDate, minutes, settingsInput, type ClinicSettingsInput } from "./validation";

export const defaultSettings: ClinicSettingsInput = {
  workingHours: [],
  blockedDates: [],
  slotDuration: 30,
  capacity: 1,
  retentionDays: 180,
  phone: "+91 99167 31170",
  address: "Rangarao Building, Polytechnic Road, opp. Thiyosopicapal Society, KR Extension, Chintamani, Karnataka 563125, India.",
  homeIntro: "Visit us at Rangarao Building, Polytechnic Road, KR Extension, Chintamani. Contact the clinic for consultation timings and appointment enquiries.",
  about: "Dr Rangarao Skin and Diabetic Care Center focuses on skin and diabetes care in Chintamani, Karnataka.",
  skinCare: "Contact the clinic to enquire about a skin care consultation and confirm availability.",
  diabetesCare: "Contact the clinic to enquire about a diabetes care consultation and confirm availability.",
  privacyContact: "",
};

export async function getSettings(client: Prisma.TransactionClient = db): Promise<ClinicSettingsInput> {
  const row = await client.clinicSettings.findUnique({ where: { id: 1 } });
  if (!row) return defaultSettings;
  return readSettings(row);
}

function readSettings({ id: _id, updatedAt: _updatedAt, ...values }: ClinicSettings) {
  void _id;
  void _updatedAt;
  return settingsInput.parse(values);
}

export async function getPublicSettings() {
  try {
    return await getSettings();
  } catch {
    return defaultSettings;
  }
}

export function validateSlot(settings: ClinicSettingsInput, date: string, time: string) {
  if (settings.blockedDates.includes(date)) {
    throw new DomainError("The clinic has blocked that date.", 409);
  }

  const start = minutes(time);
  const duration = settings.slotDuration;
  // With no configured hours, staff can choose a time on the daily slot grid.
  if (settings.workingHours.length === 0) {
    if (start % duration === 0 && start + duration <= 1440) return;
    throw new DomainError("Choose a time that aligns with the clinic's slot duration.", 409);
  }

  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const fits = settings.workingHours.some((period) => {
    const opening = minutes(period.start);
    return period.day === day && start >= opening && start + duration <= minutes(period.end)
      && (start - opening) % duration === 0;
  });
  if (!fits) {
    throw new DomainError("Choose an available slot within the configured working hours.", 409);
  }
}

export async function saveSettings(actorId: string, input: unknown) {
  const parsed = settingsInput.parse(input);
  const settings = { ...parsed, blockedDates: [...new Set(parsed.blockedDates)].sort() };

  return withScheduleLock(async (tx) => {
    const scheduled = await tx.appointment.groupBy({
      by: ["scheduledDate", "scheduledTime"],
      where: { status: "CONFIRMED", scheduledDate: { gte: clinicDate() } },
      _count: { _all: true },
    });
    for (const slot of scheduled) {
      try {
        if (!slot.scheduledDate || !slot.scheduledTime || slot._count._all > settings.capacity) {
          throw new DomainError("Invalid slot.", 409);
        }
        validateSlot(settings, slot.scheduledDate, slot.scheduledTime);
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        throw new DomainError("Reschedule or cancel appointments that conflict with these settings before saving.", 409);
      }
    }

    const previous = await getSettings(tx);
    const fields = (Object.keys(settings) as Array<keyof ClinicSettingsInput>).filter(
      (field) => JSON.stringify(settings[field]) !== JSON.stringify(previous[field]),
    );
    await tx.clinicSettings.upsert({ where: { id: 1 }, create: settings, update: settings });
    await tx.auditLog.create({ data: { actorId, action: "SETTINGS_UPDATED", details: { fields } } });
    return settings;
  });
}
