import { Cross, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CLINIC_NAME, directionsHref, telephoneHref } from "./clinic";
import { SiteNav } from "./site-nav";

function ClinicMark() {
  return (
    <Link href="/" className="clinic-brand" aria-label={CLINIC_NAME}>
      <span className="clinic-mark"><Cross aria-hidden size={21} /></span>
      <span className="clinic-brand-name">
        Dr Rangarao
        <span>Skin and Diabetic Care Center</span>
      </span>
    </Link>
  );
}

type ContactDetails = { phone: string; address: string };

export function SiteShell({ children, phone, address }: ContactDetails & { children: ReactNode }) {
  return (
    <div className="clinic-site">
      <a className="clinic-skip" href="#main-content">Skip to main content</a>
      <header className="clinic-header">
        <div className="clinic-wrap clinic-header-inner">
          <ClinicMark />
          <SiteNav />
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="clinic-footer">
        <div className="clinic-wrap">
          <div className="clinic-footer-grid">
            <div>
              <ClinicMark />
              <p className="clinic-footer-description">Skin and diabetes care in Chintamani, Karnataka.</p>
            </div>
            <nav className="clinic-footer-links" aria-label="Footer navigation">
              <h2>Explore</h2>
              <Link href="/about">About the clinic</Link>
              <Link href="/care">Skin and diabetes care</Link>
              <Link href="/appointment">Request an appointment</Link>
              <Link href="/privacy">Privacy notice</Link>
            </nav>
            <div className="clinic-footer-links">
              <h2>Visit or call</h2>
              <a href={telephoneHref(phone)}><Phone size={16} aria-hidden /> {phone}</a>
              <a href={directionsHref(address)}><MapPin size={17} aria-hidden /> {address}</a>
            </div>
          </div>
          <p className="clinic-footer-bottom">© {CLINIC_NAME}</p>
        </div>
      </footer>
    </div>
  );
}
