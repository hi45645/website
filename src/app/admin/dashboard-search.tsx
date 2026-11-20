"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { findAppointments } from "./dashboard-data";
import { searchAppointments } from "./dashboard-actions";
import { categoryLabel, statusLabel, statuses } from "./admin-format";
import styles from "./admin.module.css";

export function DashboardSearch({ initial }: { initial: Awaited<ReturnType<typeof findAppointments>> }) {
  const [state, setState] = useState(initial);
  const [query, setQuery] = useState(initial.query);
  const [status, setStatus] = useState(initial.status);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function search(data: FormData) {
    startTransition(async () => {
      try {
        const result = await searchAppointments(data);
        setError(result.error);
        if ("rows" in result) setState(result);
      } catch {
        setError("Search is temporarily unavailable.");
      }
    });
  }
  return (
    <section className={styles.card} aria-labelledby="appointment-list">
      <h2 id="appointment-list">Appointment requests</h2>
      <form action={search}>
        <div className={styles.fields}>
          <label>Search <input name="query" type="search" maxLength={120} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, mobile or reference" /></label>
          <label>Status filter
            <select name="status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.actions}><button disabled={pending}>{pending ? "Searching…" : "Search"}</button></div>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.results} aria-busy={pending}>
        {state.rows.length ? (
          <ul>
            {state.rows.map((row) => (
              <li key={row.id} className={styles.result}>
                <strong>{row.name}</strong>
                <span>{categoryLabel[row.category]}</span>
                <span>{row.preferredDate}</span>
                <span>{statusLabel[row.status]}</span>
                <Link href={`/admin/appointments/${row.id}`} prefetch={false}>{row.reference}</Link>
              </li>
            ))}
          </ul>
        ) : <p role="status">No matching appointment requests.</p>}
        {(state.page > 1 || state.hasNext) && (
          <form action={search} className={styles.row} aria-label="Appointment pages">
            <input type="hidden" name="query" value={state.query} />
            <input type="hidden" name="status" value={state.status} />
            {state.page > 1 && <button name="page" value={state.page - 1} disabled={pending}>Previous page</button>}
            <span>Page {state.page}</span>
            {state.hasNext && <button name="page" value={state.page + 1} disabled={pending}>Next page</button>}
          </form>
        )}
      </div>
    </section>
  );
}
