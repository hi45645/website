import type { Metadata } from "next";
import { CareCards, PageIntro } from "@/components/public-elements";
import { readPublicSettings } from "@/components/public-settings";

export const metadata: Metadata = {
  title: "Skin and diabetes care",
  description: "Find out how to request a skin care or diabetes care appointment in Chintamani.",
  alternates: { canonical: "/care" },
};

export default async function CarePage() {
  const { skinCare, diabetesCare } = await readPublicSettings();
  return (
    <>
      <PageIntro title="Skin and diabetes care" copy="Choose the type of care when you send your appointment request." />
      <section className="clinic-wrap clinic-section">
        <CareCards skinCare={skinCare} diabetesCare={diabetesCare} detail />
      </section>
    </>
  );
}
