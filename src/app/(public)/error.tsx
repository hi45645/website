"use client";

import Link from "next/link";

export default function PublicError({ reset }: { reset: () => void }) {
  return (
    <section className="clinic-wrap clinic-section clinic-prose">
      <h1>We couldn’t load this page</h1>
      <p>Try again or return to the home page.</p>
      <div className="clinic-button-row">
        <button type="button" className="clinic-button clinic-button-primary" onClick={reset}>Try again</button>
        <Link href="/" className="clinic-button clinic-button-outline">Return home</Link>
      </div>
    </section>
  );
}
