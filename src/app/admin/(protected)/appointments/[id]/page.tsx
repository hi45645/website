import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { categoryLabel, clinicTimestamp, statusLabel } from "../../../admin-format";
import { MutationForm } from "../../../mutation-form";
import styles from "../../../admin.module.css";
import { updateAppointment } from "./actions";

export default async function AppointmentDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const appointment = await db.appointment.findUnique({ where: { id } });
  if (!appointment) notFound();

  const audit = await db.auditLog.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const pending = appointment.status === "PENDING";
  const confirmed = appointment.status === "CONFIRMED";
  const update = updateAppointment.bind(null, id);
  return (
    <>
      <h1>Appointment request</h1>
      <section className={styles.card}>
        <h2>{appointment.reference}</h2>
        <dl className={styles.grid}>
          <div><dt>Patient</dt><dd>{appointment.name}</dd></div>
          <div><dt>Mobile</dt><dd>{appointment.mobile}</dd></div>
          <div><dt>Care category</dt><dd>{categoryLabel[appointment.category]}</dd></div>
          <div><dt>Status</dt><dd>{statusLabel[appointment.status]}</dd></div>
          <div><dt>Preferred date</dt><dd>{appointment.preferredDate}</dd></div>
          <div><dt>Preferred time window</dt><dd>{appointment.timeWindow}</dd></div>
          <div><dt>Scheduled time</dt><dd>{appointment.scheduledDate ? `${appointment.scheduledDate} at ${appointment.scheduledTime} IST` : "Awaiting scheduling"}</dd></div>
          <div><dt>Notification</dt><dd>{appointment.notificationStatus.toLowerCase().replaceAll("_", " ")}</dd></div>
          <div><dt>Received</dt><dd>{clinicTimestamp.format(appointment.createdAt)}</dd></div>
        </dl>
      </section>
      {(pending || confirmed) && (
        <section className={styles.card}>
          <h2>Schedule appointment</h2>
          <MutationForm action={update} label="Schedule appointment">
            <div className={styles.fields}>
              <label>Scheduled date<input type="date" name="scheduledDate" defaultValue={appointment.scheduledDate ?? appointment.preferredDate} required /></label>
              <label>Scheduled time<input type="time" name="scheduledTime" defaultValue={appointment.scheduledTime ?? ""} required /></label>
            </div>
            <div className={styles.actions}>
              <button name="operation" value={pending ? "CONFIRMED" : "RESCHEDULE"}>{pending ? "Confirm" : "Reschedule"}</button>
            </div>
          </MutationForm>
          <MutationForm action={update} label="Change appointment status">
            <div className={styles.actions}>
              <button name="operation" value="CANCELLED">Cancel appointment</button>
              {confirmed && <><button name="operation" value="COMPLETED">Mark completed</button><button name="operation" value="NO_SHOW">Mark no-show</button></>}
            </div>
          </MutationForm>
        </section>
      )}
      <section className={styles.card}>
        <h2>Administrative notes</h2>
        <MutationForm action={update} label="Save administrative notes">
          <label>Administrative notes
            <small>Use this field for scheduling only. Do not enter clinical records.</small>
            <textarea name="notes" maxLength={1500} defaultValue={appointment.notes ?? ""} />
          </label>
          <div className={styles.actions}><button name="operation" value="NOTES">Save notes</button></div>
        </MutationForm>
      </section>
      <section className={styles.card}>
        <h2>Appointment audit trail</h2>
        {audit.length ? (
          <ul className={styles.audit}>{audit.map((entry) => <li key={entry.id}>{clinicTimestamp.format(entry.createdAt)} · {entry.action.replaceAll("_", " ").toLowerCase()} · {entry.actorId}</li>)}</ul>
        ) : <p>No audit entries.</p>}
      </section>
    </>
  );
}
