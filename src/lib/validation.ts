import { AppointmentCategory, AppointmentStatus } from "@prisma/client";
import { z } from "zod";

export const clinicTimezone = "Asia/Kolkata";
const clinicFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: clinicTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const clinicClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: clinicTimezone,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function clinicDate(now = new Date()): string {
  const parts = clinicFormatter.formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function clinicTime(now = new Date()): string {
  return clinicClock.format(now);
}

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  }, "Enter a valid date.");

export const clockTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");
const timeWindow = z.string().refine((value) => {
  const [start, end, extra] = value.split("-");
  return extra === undefined && clockTime.safeParse(start).success &&
    clockTime.safeParse(end).success && start < end;
}, "Enter a time window with an end after its start.");

const mobile = z.string().trim().max(26).transform((value) => {
  const digits = value.replace(/[\s()-]/g, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : digits;
}).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter a mobile number with its country code."));

export const appointmentInput = z.object({
  name: z.string().trim().min(2, "Enter a patient name.").max(100),
  mobile,
  date: isoDate,
  timeWindow,
  category: z.nativeEnum(AppointmentCategory),
  idempotencyKey: z.string().uuid(),
  website: z.literal("").optional(),
}).strict();

export const appointmentChangeInput = z.object({
  id: z.string().min(1).max(64),
  status: z.nativeEnum(AppointmentStatus).optional(),
  expectedStatus: z.nativeEnum(AppointmentStatus).optional(),
  scheduledDate: isoDate.optional(),
  scheduledTime: clockTime.optional(),
  notes: z.string().trim().max(1500).optional(),
}).strict().refine((input) =>
  (input.scheduledDate === undefined) === (input.scheduledTime === undefined),
"Provide both a scheduled date and a scheduled time.");

const workPeriod = z.object({
  day: z.number().int().min(0).max(6),
  start: clockTime,
  end: clockTime,
}).strict().refine((period) => period.start < period.end, "Working hours must end after they start.");

export const settingsInput = z.object({
  workingHours: z.array(workPeriod).max(28),
  blockedDates: z.array(isoDate).max(730),
  slotDuration: z.number().int().min(5).max(240),
  capacity: z.number().int().min(1).max(100),
  retentionDays: z.number().int().min(1).max(3650),
  phone: z.string().trim().min(8).max(26).refine((value) => mobile.safeParse(value).success,
    "Enter an international phone number."),
  address: z.string().trim().min(10).max(500),
  homeIntro: z.string().trim().min(10).max(1000),
  about: z.string().trim().min(10).max(2500),
  skinCare: z.string().trim().min(10).max(1500),
  diabetesCare: z.string().trim().min(10).max(1500),
  privacyContact: z.string().trim().max(300),
}).strict().superRefine((settings, context) => {
  const periods = [...settings.workingHours].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  periods.forEach((period, index) => {
    const previous = periods[index - 1];
    if (previous?.day === period.day && previous.end > period.start) {
      context.addIssue({ code: "custom", path: ["workingHours"], message: "Working periods cannot overlap." });
    }
    if (minutes(period.end) - minutes(period.start) < settings.slotDuration) {
      context.addIssue({ code: "custom", path: ["workingHours"], message: "Each working period must fit a full slot." });
    }
  });
});

export function minutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

export type AppointmentInput = z.input<typeof appointmentInput>;
export type AppointmentChange = z.input<typeof appointmentChangeInput>;
export type ClinicSettingsInput = z.infer<typeof settingsInput>;
