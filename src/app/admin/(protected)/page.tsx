import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { statusLabel, statuses } from "../admin-format";
import styles from "../admin.module.css";
import { findAppointments } from "../dashboard-data";
import { DashboardSearch } from "../dashboard-search";

export default async function Dashboard() {
  await requireAdmin();
  const [counts, initial] = await Promise.all([
    db.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
    findAppointments({ status: "", query: "", page: 1 }),
  ]);

  return (
    <>
      <h1>Appointments</h1>
      <dl className={styles.grid} aria-label="Appointment counts">
        {statuses.map((status) => (
          <div key={status} className={styles.count}>
            <dt>{statusLabel[status]}</dt><dd><strong>{counts.find((item) => item.status === status)?._count._all ?? 0}</strong></dd>
          </div>
        ))}
      </dl>
      <DashboardSearch initial={initial} />
    </>
  );
}
