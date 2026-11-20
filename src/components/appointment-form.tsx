"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";

const successText = "Your request has been received. The clinic will contact you to confirm availability.";

export function AppointmentForm({ earliestDate, initialCare }: {
  earliestDate: string;
  initialCare: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const activeRequest = useRef(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const responseFocus = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (reference) responseFocus.current?.focus();
  }, [reference]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;

    const data = new FormData(event.currentTarget);
    const start = String(data.get("start") ?? "");
    const end = String(data.get("end") ?? "");
    setError("");

    if (start >= end) {
      setError("Choose an end time after your start time.");
      event.currentTarget.querySelector<HTMLInputElement>("#preferred-end")?.focus();
      return;
    }

    const request = {
      name: String(data.get("name") ?? "").trim(),
      mobile: String(data.get("mobile") ?? "").trim(),
      date: String(data.get("date") ?? ""),
      timeWindow: start + "-" + end,
      category: String(data.get("category") ?? ""),
      website: String(data.get("website") ?? ""),
    };

    const signature = JSON.stringify(request);
    activeRequest.current = true;
    setPending(true);
    try {
      if (attempt.current?.signature !== signature) {
        attempt.current = { signature, key: crypto.randomUUID() };
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, idempotencyKey: attempt.current.key }),
      });
      const result: { reference?: string; error?: string } = await response.json();

      if (response.ok && result.reference) {
        setReference(result.reference);
      } else {
        setError(result.error || "We couldn’t submit your request. Please try again or call the clinic.");
      }
    } catch {
      setError("We couldn’t submit your request. Please try again or call the clinic.");
    } finally {
      activeRequest.current = false;
      setPending(false);
    }
  }

  if (reference) {
    return (
      <div className="clinic-form-card clinic-success">
        <span className="clinic-icon"><CircleCheck size={25} aria-hidden /></span>
        <h2 ref={responseFocus} tabIndex={-1}>Request received</h2>
        <p>{successText}</p>
        <p className="clinic-reference"><strong>Request reference</strong><code>{reference}</code></p>
        <Link href="/" className="clinic-text-link">Back to home <ArrowRight size={17} aria-hidden /></Link>
      </div>
    );
  }

  return (
    <form className="clinic-form-card" method="post" onSubmit={submit} aria-busy={pending}>
      <div className="clinic-form-grid">
        <div className="clinic-field">
          <label htmlFor="patient-name">Patient name</label>
          <input id="patient-name" name="name" autoComplete="name" required maxLength={100} />
        </div>
        <div className="clinic-field">
          <label htmlFor="patient-mobile">Mobile number</label>
          <input id="patient-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" aria-describedby="mobile-help" required maxLength={24} />
          <small id="mobile-help">Use a 10-digit Indian mobile number or include the country code.</small>
        </div>
        <div className="clinic-field">
          <label htmlFor="preferred-date">Preferred date</label>
          <input id="preferred-date" name="date" type="date" min={earliestDate} required />
        </div>
        <div className="clinic-field">
          <label htmlFor="care-category">Care category</label>
          <select id="care-category" name="category" defaultValue={initialCare} required>
            <option value="" disabled>Choose a category</option>
            <option value="SKIN">Skin care</option>
            <option value="DIABETES">Diabetes care</option>
          </select>
        </div>
      </div>
      <fieldset aria-describedby="time-help" className="clinic-time-field">
        <legend>Preferred time window</legend>
        <div className="clinic-form-grid">
          <div className="clinic-field">
            <label htmlFor="preferred-start">Preferred start time</label>
            <input id="preferred-start" type="time" name="start" required />
          </div>
          <div className="clinic-field">
            <label htmlFor="preferred-end">Preferred end time</label>
            <input id="preferred-end" type="time" name="end" required />
          </div>
        </div>
        <small id="time-help">Enter your preferred times in India Standard Time. The clinic will confirm availability.</small>
      </fieldset>
      <div hidden>
        <label htmlFor="request-website">Leave this field empty</label>
        <input id="request-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error && <p role="alert" className="clinic-form-error">{error}</p>}
      <p className="clinic-form-note"><Link href="/privacy">Read the privacy notice</Link> to learn how the clinic handles your request details.</p>
      <button type="submit" className="clinic-button clinic-button-primary" disabled={pending}>
        {pending ? "Sending request…" : "Send appointment request"} <ArrowRight size={18} aria-hidden />
      </button>
      <noscript><p>Enable JavaScript to submit this form, or call the clinic to request an appointment.</p></noscript>
    </form>
  );
}
