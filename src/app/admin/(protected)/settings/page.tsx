import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { clinicTimestamp } from "../../admin-format";
import styles from "../../admin.module.css";
import { MutationForm } from "../../mutation-form";
import { updateSettings } from "./actions";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function Settings() {
  await requireAdmin();
  const [settings, audit] = await Promise.all([
    getSettings(),
    db.auditLog.findMany({
      where: { appointmentId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return (
    <>
      <h1>Clinic settings</h1>
      <MutationForm action={updateSettings} label="Clinic settings">
        <section className={styles.card}>
          <h2>Working hours</h2>
          <p className={styles.muted}>Use 24-hour time in Asia/Kolkata. Enter intervals such as 09:00-12:00, 14:00-17:00. Leave days without configured hours blank.</p>
          <div className={styles.fields}>
            {days.map((day, number) => (
              <label key={day}>{day}<input name={`hours-${number}`} maxLength={120} defaultValue={settings.workingHours.filter((hour) => hour.day === number).map((hour) => `${hour.start}-${hour.end}`).join(", ")} /></label>
            ))}
            <label>Blocked dates <small>One date per line in YYYY-MM-DD format.</small><textarea name="blockedDates" defaultValue={settings.blockedDates.join("\n")} /></label>
            <label>Slot duration (minutes)<input name="slotDuration" type="number" min={5} max={240} defaultValue={settings.slotDuration} required /></label>
            <label>Capacity per slot<input name="capacity" type="number" min={1} max={100} defaultValue={settings.capacity} required /></label>
          </div>
        </section>
        <section className={styles.card}>
          <h2>Public contact and copy</h2>
          <div className={styles.fields}>
            <label>Clinic phone<input name="phone" type="tel" maxLength={26} defaultValue={settings.phone} required /></label>
            <label>Clinic address<textarea name="address" maxLength={500} defaultValue={settings.address} required /></label>
            <label>Homepage introduction<textarea name="homeIntro" maxLength={1000} defaultValue={settings.homeIntro} required /></label>
            <label>About the clinic<textarea name="about" maxLength={2500} defaultValue={settings.about} required /></label>
            <label>Skin care overview<textarea name="skinCare" maxLength={1500} defaultValue={settings.skinCare} required /></label>
            <label>Diabetes care overview<textarea name="diabetesCare" maxLength={1500} defaultValue={settings.diabetesCare} required /></label>
            <label>Public privacy contact<input name="privacyContact" maxLength={300} defaultValue={settings.privacyContact} /></label>
            <label>Retention (days)<input name="retentionDays" type="number" min={1} max={3650} defaultValue={settings.retentionDays} required /></label>
          </div>
        </section>
        <div className={styles.actions}><button>Save settings</button></div>
      </MutationForm>
      <section className={styles.card}>
        <h2>Configuration audit trail</h2>
        {audit.length ? (
          <ul className={styles.audit}>{audit.map((entry) => <li key={entry.id}>{clinicTimestamp.format(entry.createdAt)} · {entry.action.replaceAll("_", " ").toLowerCase()} · {entry.actorId}</li>)}</ul>
        ) : <p>No configuration changes recorded.</p>}
      </section>
    </>
  );
}
