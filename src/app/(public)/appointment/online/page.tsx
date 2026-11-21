import { CalendarClock, Phone } from "lucide-react";
import type { Metadata } from "next";
import { AppointmentForm } from "@/components/appointment-form";
import { telephoneHref } from "@/components/clinic";
import { clinicDate } from "@/lib/validation";
import { PageIntro } from "@/components/public-elements";
import { readPublicSettings } from "@/components/public-settings";

export const metadata: Metadata = {
  title: "Request an appointment",
  description: "Send your preferred date and time window for a skin care or diabetes care appointment.",
  alternates: { canonical: "/appointment/online" },
};

export default async function AppointmentPage({ searchParams }: {
  searchParams: Promise<{ care?: string }>;
}) {
  const [{ care }, { phone }] = await Promise.all([searchParams, readPublicSettings()]);
  const initialCare = care === "skin" ? "SKIN" : care === "diabetes" ? "DIABETES" : "";
  const earliestDate = clinicDate();

  return (
    <>
      <PageIntro title="Online appointment form" copy="Share your preferred date and time. The clinic will call you to confirm availability." />
      <section className="clinic-wrap clinic-section clinic-booking-grid" aria-label="Appointment request">
        <AppointmentForm earliestDate={earliestDate} initialCare={initialCare} />
        <aside className="clinic-booking-aside">
          <span className="clinic-icon"><CalendarClock size={23} aria-hidden /></span>
          <h2>What happens next?</h2>
          <p>The clinic reviews your request and calls the mobile number you provide to arrange your visit.</p>
          <a className="clinic-text-link" href={telephoneHref(phone)}>
            <Phone size={17} aria-hidden /> {phone}
          </a>
        </aside>
      </section>
    </>
  );
}
