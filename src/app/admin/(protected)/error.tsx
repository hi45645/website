"use client";

import styles from "../admin.module.css";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <section className={styles.card}>
      <h1>Clinic dashboard unavailable</h1>
      <p role="alert">The dashboard couldn’t load. Please try again.</p>
      <div className={styles.actions}><button onClick={reset}>Try again</button></div>
    </section>
  );
}
