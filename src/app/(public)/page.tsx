import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";
import { CLINIC_NAME, HOME_TITLE, directionsHref, siteUrl, telephoneHref } from "@/components/clinic";
import { readPublicSettings } from "@/components/public-settings";
import { AppointmentLink, CareCards } from "@/components/public-elements";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const { phone, address, homeIntro, skinCare, diabetesCare } = await readPublicSettings();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: CLINIC_NAME,
    url: siteUrl().href,
    telephone: telephoneHref(phone).slice(4),
    address,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <section className="clinic-hero">
        <div className="clinic-wrap clinic-hero-grid">
          <div className="clinic-hero-copy">
            <p className="clinic-hero-clinic">{CLINIC_NAME}</p>
            <h1>{HOME_TITLE}</h1>
            <p className="clinic-hero-intro">{homeIntro}</p>
            <div className="clinic-button-row">
              <AppointmentLink />
              <a className="clinic-button clinic-button-outline" href={telephoneHref(phone)}>
                <Phone size={17} aria-hidden /> Call clinic
              </a>
            </div>
          </div>
          <div className="clinic-hero-visual">
            <Image src="/clinic-botanical.webp" alt="" fill priority sizes="(max-width: 760px) 100vw, 48vw" />
          </div>
        </div>
      </section>
      <section className="clinic-wrap clinic-section">
        <h2 className="clinic-section-title">Care at the clinic</h2>
        <CareCards skinCare={skinCare} diabetesCare={diabetesCare} />
      </section>
      <section className="clinic-wrap clinic-location-section">
        <div className="clinic-location-box">
          <span className="clinic-icon"><MapPin size={24} aria-hidden /></span>
          <div>
            <h2>Visit the clinic</h2>
            <address>{address}</address>
          </div>
          <a className="clinic-button clinic-button-outline" href={directionsHref(address)}>
            Get directions <ArrowUpRight size={17} aria-hidden />
          </a>
        </div>
      </section>
    </>
  );
}
