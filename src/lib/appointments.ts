import { randomBytes } from "node:crypto";
import { AppointmentStatus, Prisma, type Appointment } from "@prisma/client";
import { db, withScheduleLock } from "./db";
import { DomainError } from "./errors";
import { notificationConfigured } from "./notifications";
import { getSettings, validateSlot } from "./settings";
import { appointmentChangeInput, appointmentInput, clinicDate, clinicTime } from "./validation";

export async function createAppointment(input: unknown) {
  const { date: preferredDate, idempotencyKey, name, mobile, timeWindow, category } = appointmentInput.parse(input);
  const data = { idempotencyKey, name, mobile, preferredDate, timeWindow, category };
  const replay = (existing: Appointment) => {
    if (existing.name !== name || existing.mobile !== mobile || existing.preferredDate !== preferredDate ||
      existing.timeWindow !== timeWindow || existing.category !== category) {
      throw new DomainError("Start a new request to change a submitted appointment request.", 409);
    }
    return { appointment: existing, created: false };
  };
  const existing = await db.appointment.findUnique({ where: { idempotencyKey } });
  if (existing) return replay(existing);

  if (preferredDate < clinicDate()) throw new DomainError("Choose today or a future date.");

  try {
    const appointment = await db.appointment.create({
      data: {
        ...data,
        reference: randomBytes(18).toString("base64url"),
        notificationStatus: notificationConfigured() ? "PENDING" : "NOT_CONFIGURED",
      },
    });
    return { appointment, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await db.appointment.findUnique({ where: { idempotencyKey } });
      if (concurrent) return replay(concurrent);
    }
    throw error;
  }
}

const transitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function changeAppointment(actorId: string, input: unknown) {
  const { id, status, expectedStatus, scheduledDate, scheduledTime, notes } = appointmentChangeInput.parse(input);

  return withScheduleLock(async (tx) => {
    const current = await tx.appointment.findUnique({ where: { id } });
    if (!current) throw new DomainError("Appointment request not found.", 404);
    if (expectedStatus && current.status !== expectedStatus) {
      throw new DomainError("This appointment has changed. Reload it before making another change.", 409);
    }

    const nextStatus = status ?? current.status;
    const changedStatus = nextStatus !== current.status;
    if (changedStatus && !transitions[current.status].includes(nextStatus)) {
      throw new DomainError("That status change is not allowed.", 409);
    }

    const scheduling = scheduledDate !== undefined && scheduledTime !== undefined;
    if (scheduling && nextStatus !== "CONFIRMED") {
      throw new DomainError("Only a confirmed appointment can have a new scheduled time.");
    }

    if (nextStatus === "CONFIRMED" && (changedStatus || scheduling)) {
      if (!scheduledDate || !scheduledTime) throw new DomainError("Choose a date and time to confirm.");
      const now = new Date();
      const today = clinicDate(now);
      if (scheduledDate < today || (scheduledDate === today && scheduledTime <= clinicTime(now))) {
        throw new DomainError("Choose a date and time in the future.");
      }
      const settings = await getSettings(tx);
      validateSlot(settings, scheduledDate, scheduledTime);
      const occupants = await tx.appointment.count({
        where: { status: "CONFIRMED", scheduledDate, scheduledTime, id: { not: id } },
      });
      if (occupants >= settings.capacity) throw new DomainError("This slot has reached its capacity.", 409);
    }

    if (!changedStatus && !scheduling && (notes === undefined || (notes || null) === current.notes)) {
      return current;
    }
    const result = await tx.appointment.update({
      where: { id },
      data: {
        status: nextStatus,
        ...(scheduling ? { scheduledDate, scheduledTime } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        appointmentId: id,
        action: changedStatus ? "STATUS_CHANGED" : scheduling ? "RESCHEDULED" : "NOTES_UPDATED",
        details: {
          ...(changedStatus ? { from: current.status, to: nextStatus } : {}),
          ...(scheduling ? { previousDate: current.scheduledDate, previousTime: current.scheduledTime,
            scheduledDate, scheduledTime } : {}),
          ...(notes !== undefined ? { notesChanged: (notes || null) !== current.notes } : {}),
        },
      },
    });
    return result;
  });
}
