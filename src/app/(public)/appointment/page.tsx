import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { telephoneHref } from "@/components/clinic";
import { PageIntro } from "@/components/public-elements";
import { readPublicSettings } from "@/components/public-settings";

export const metadata: Metadata = {
  title: "Request an appointment",
  description: "Contact the clinic on WhatsApp to request an appointment.",
  alternates: { canonical: "/appointment" },
};

export default async function AppointmentPage({ searchParams }: {
  searchParams: Promise<{ care?: string }>;
}) {
  const [{ care }, { phone }] = await Promise.all([searchParams, readPublicSettings()]);
  const onlineForm = care === "skin" || care === "diabetes"
    ? `/appointment/online?care=${care}`
    : "/appointment/online";
  const message = "Hello, I’d like to request an appointment. Could you please let me know your availability?";
  const whatsapp = `https://wa.me/919916731170?text=${encodeURIComponent(message)}`;

  return (
    <>
      <PageIntro title="Request an appointment" copy="Message the clinic on WhatsApp to ask about appointment availability." />
      <section className="clinic-wrap clinic-section" aria-label="Appointment request">
        <div className="clinic-prose">
          <p>WhatsApp opens with a short message you can edit and send. The clinic will confirm availability.</p>
          <div className="clinic-button-row">
            <a className="clinic-button clinic-button-primary" href={whatsapp}>
              <MessageCircle size={19} aria-hidden /> Send on WhatsApp
            </a>
            <a className="clinic-button clinic-button-outline" href={telephoneHref(phone)}>
              <Phone size={18} aria-hidden /> Call the clinic
            </a>
          </div>
          {process.env.DATABASE_URL?.trim() && <p><Link href={onlineForm}>Use the online appointment form</Link></p>}
        </div>
      </section>
    </>
  );
}
