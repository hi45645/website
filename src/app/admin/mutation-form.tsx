"use client";

import { useActionState } from "react";
import styles from "./admin.module.css";

export type MutationState = { error?: string; success?: string };

export function MutationForm({
  action, children, label,
}: {
  action: (state: MutationState, form: FormData) => Promise<MutationState>;
  children: React.ReactNode;
  label: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form action={submit} aria-label={label} aria-busy={pending}>
      <fieldset disabled={pending}>
        {children}
      </fieldset>
      {pending && <p role="status">Saving…</p>}
      {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
      {state.success && <p role="status" className={styles.ok}>{state.success}</p>}
    </form>
  );
}
