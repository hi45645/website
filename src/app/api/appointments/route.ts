import { ZodError } from "zod";
import { createAppointment } from "@/lib/appointments";
import { DomainError } from "@/lib/errors";
import { sendAppointmentNotification } from "@/lib/notifications";
import { hasTrustedOrigin } from "@/lib/origin";
import { enforceRateLimit, rateLimitPolicy, readSmallJson } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) throw new DomainError("Refresh the form and try again.", 403);
    const input = await readSmallJson(request);
    if (input && typeof input === "object" && "website" in input && input.website !== "") {
      throw new DomainError("The request could not be submitted.");
    }
    await enforceRateLimit(request, "appointment");
    const { appointment, created } = await createAppointment(input);
    if (created && appointment.notificationStatus === "PENDING") {
      await sendAppointmentNotification(appointment.id);
    }
    return Response.json({ reference: appointment.reference }, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Check the form and try again." }, { status: 400 });
    }
    if (error instanceof DomainError) {
      const headers = error.status === 429 ? { "Retry-After": String(rateLimitPolicy.appointment.seconds) } : undefined;
      return Response.json({ error: error.message }, { status: error.status, headers });
    }
    return Response.json({ error: "Appointment requests are temporarily unavailable. Please call the clinic." }, { status: 503 });
  }
}
