import type { NotificationStatus } from "@prisma/client";
import { db } from "./db";

export function notificationConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM && process.env.NOTIFICATION_TO);
}

export async function sendAppointmentNotification(id: string): Promise<void> {
  let status: NotificationStatus;
  if (!notificationConfigured()) {
    status = "NOT_CONFIGURED";
  } else {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `clinic-appointment/${id}`,
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATION_FROM,
          to: [process.env.NOTIFICATION_TO],
          subject: "New clinic appointment request",
          text: "A new appointment request is available. Sign in to your clinic dashboard to review it.",
        }),
        signal: AbortSignal.timeout(4000),
      });
      status = response.ok ? "ACCEPTED" : response.status >= 500 ? "UNKNOWN" : "FAILED";
      await response.body?.cancel().catch(() => undefined);
    } catch {
      // A network failure can occur after provider acceptance.
      status = "UNKNOWN";
    }
  }
  try {
    await db.appointment.updateMany({ where: { id, notificationStatus: "PENDING" }, data: { notificationStatus: status } });
  } catch {
    // PENDING remains visible when a result could not be recorded.
  }
}
