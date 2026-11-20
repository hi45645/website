import { ArrowRight, CalendarDays, Droplet, ScanFace } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function AppointmentLink({ children = "Request an appointment" }: { children?: ReactNode }) {
  return (
    <Link className="clinic-button clinic-button-primary" href="/appointment">
      <CalendarDays size={18} aria-hidden /> {children} <ArrowRight size={17} aria-hidden />
    </Link>
  );
}

export function PageIntro({ title, copy }: { title: string; copy?: string }) {
  return (
    <section className="clinic-page-intro">
      <div className="clinic-wrap">
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
    </section>
  );
}

export function CareCards({ skinCare, diabetesCare, detail = false }: {
  skinCare: string;
  diabetesCare: string;
  detail?: boolean;
}) {
  const CardHeading = detail ? "h2" : "h3";
  return (
    <div className="clinic-card-grid">
      <article className="clinic-care-card" id="skin">
        <span className="clinic-icon"><ScanFace size={23} aria-hidden /></span>
        <CardHeading>Skin care</CardHeading>
        <p>{skinCare}</p>
        {detail
          ? <Link href="/appointment?care=skin" className="clinic-text-link">Request a skin care appointment <ArrowRight size={17} aria-hidden /></Link>
          : <Link href="/care#skin" className="clinic-text-link">Explore skin care <ArrowRight size={17} aria-hidden /></Link>}
      </article>
      <article className="clinic-care-card" id="diabetes">
        <span className="clinic-icon"><Droplet size={23} aria-hidden /></span>
        <CardHeading>Diabetes care</CardHeading>
        <p>{diabetesCare}</p>
        {detail
          ? <Link href="/appointment?care=diabetes" className="clinic-text-link">Request a diabetes care appointment <ArrowRight size={17} aria-hidden /></Link>
          : <Link href="/care#diabetes" className="clinic-text-link">Explore diabetes care <ArrowRight size={17} aria-hidden /></Link>}
      </article>
    </div>
  );
}
