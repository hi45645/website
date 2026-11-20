import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { directionsHref, telephoneHref } from "@/components/clinic";
import { PageIntro } from "@/components/public-elements";
import { readPublicSettings } from "@/components/public-settings";

export const metadata: Metadata = {
  title: "Contact and location",
  description: "Call the clinic or get Google Maps directions to Rangarao Building, Chintamani.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const { phone, address } = await readPublicSettings();
  return (
    <>
      <PageIntro title="Contact and location" copy="Call the clinic for consultation timings and appointment enquiries." />
      <section className="clinic-wrap clinic-section clinic-card-grid">
        <article className="clinic-care-card">
          <span className="clinic-icon"><Phone size={22} aria-hidden /></span>
          <h2>Phone</h2>
          <p><a className="clinic-text-link" href={telephoneHref(phone)}>{phone}</a></p>
          <a className="clinic-button clinic-button-primary" href={telephoneHref(phone)}>Call clinic</a>
        </article>
        <article className="clinic-care-card">
          <span className="clinic-icon"><MapPin size={22} aria-hidden /></span>
          <h2>Address</h2>
          <address>{address}</address>
          <a className="clinic-button clinic-button-outline" href={directionsHref(address)}>
            Get directions <ArrowUpRight size={17} aria-hidden />
          </a>
        </article>
      </section>
    </>
  );
}
