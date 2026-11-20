"use client";

import { createAuthClient } from "better-auth/react";
import { useState, type FormEvent } from "react";
import styles from "./admin.module.css";

const auth = createAuthClient();

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const result = await auth.signIn.email({
        email: String(data.get("email")).trim(),
        password: String(data.get("password")),
      });
      if (result.error) {
        setError(result.error.status === 429 ? "Too many attempts. Try again later." : "Unable to sign in with those credentials.");
        return;
      }
      window.location.replace("/admin");
    } catch {
      setError("Sign-in is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} method="post">
      <div className={styles.fields}>
        <label>Email <input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
        <label>Password <input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button></div>
    </form>
  );
}

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setPending(true);
    setError("");
    try {
      const result = await auth.signOut();
      if (result.error) throw new Error();
      window.location.replace("/admin/login");
    } catch {
      setError("Sign-out failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" disabled={pending} onClick={logout}>{pending ? "Signing out…" : "Sign out"}</button>
      {error && <span role="alert" className={styles.error}>{error}</span>}
    </>
  );
}
