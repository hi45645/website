import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { LogoutButton } from "../auth-controls";
import styles from "../admin.module.css";

export const metadata = { title: "Clinic administration", robots: { index: false, follow: false } };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className={styles.shell}>
      <nav aria-label="Staff navigation" className={styles.nav}>
        <Link href="/admin">Appointments</Link>
        <Link href="/admin/settings">Settings</Link>
        <LogoutButton />
      </nav>
      {children}
    </div>
  );
}
