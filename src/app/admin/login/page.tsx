import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "../auth-controls";
import styles from "../admin.module.css";

export const metadata = { title: "Staff sign-in", robots: { index: false, follow: false } };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className={styles.shell}>
      <section className={`${styles.card} ${styles.narrow}`}>
        <h1>Staff sign-in</h1>
        <LoginForm />
      </section>
    </div>
  );
}
