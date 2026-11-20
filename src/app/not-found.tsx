import Link from "next/link";

export default function NotFound() {
  return (
    <main className="clinic-site clinic-wrap clinic-section clinic-prose">
      <h1>Page not found</h1>
      <p>Return to the clinic home page to find care and contact information.</p>
      <Link href="/" className="clinic-button clinic-button-primary">Go to home page</Link>
    </main>
  );
}
