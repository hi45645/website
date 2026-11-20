import type { Metadata } from "next";
import { AppointmentLink, PageIntro } from "@/components/public-elements";
import { CLINIC_NAME, telephoneHref } from "@/components/clinic";
import { readPublicSettings } from "@/components/public-settings";

export const metadata: Metadata = {
  title: "About the clinic",
  description: "Learn about Dr Rangarao Skin and Diabetic Care Center in Chintamani.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const { about, phone } = await readPublicSettings();
  return (
    <>
      <PageIntro title="About the clinic" copy={CLINIC_NAME} />
      <section className="clinic-wrap clinic-section">
        <div className="clinic-prose">
          <p>{about}</p>
          <p>For consultation timings and appointment enquiries, call <a href={telephoneHref(phone)}>{phone}</a>.</p>
          <AppointmentLink />
        </div>
      </section>
    </>
  );
}
