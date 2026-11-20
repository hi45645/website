import type { Metadata } from "next";
import { telephoneHref } from "@/components/clinic";
import { PageIntro } from "@/components/public-elements";
import { readPublicSettings } from "@/components/public-settings";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How the clinic handles information entered in appointment requests.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const { phone, privacyContact, retentionDays } = await readPublicSettings();
  return (
    <>
      <PageIntro title="Privacy notice" copy="How the clinic handles your appointment request information." />
      <section className="clinic-wrap clinic-section">
        <div className="clinic-prose">
          <h2>Information collected</h2>
          <p>The appointment form collects your name, mobile number, preferred date and time window, and your choice of skin care or diabetes care. The site creates a request reference. On Vercel, it uses a short-lived identifier derived from your network address to limit repeated or automated submissions.</p>
          <h2>How the clinic uses it</h2>
          <p>Authorised clinic staff use your request to contact you, arrange your visit, and update the appointment status. Staff can add scheduling notes. If email alerts are enabled, they direct staff to sign in to the dashboard to review new requests.</p>
          <h2>Retention and deletion</h2>
          <p>The clinic’s configured retention period is {retentionDays} days. The clinic can run a maintenance process to remove records that meet its retention criteria. Backup copies may remain until those backups expire. To ask for access, correction, or deletion, contact the clinic. Staff may need to verify the request before sharing or changing information.</p>
          <h2>Privacy contact</h2>
          {privacyContact && <p>{privacyContact}</p>}
          <p>For privacy enquiries, call <a href={telephoneHref(phone)}>{phone}</a>.</p>
        </div>
      </section>
    </>
  );
}
