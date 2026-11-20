import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CLINIC_NAME, siteUrl } from "@/components/clinic";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: CLINIC_NAME, template: `%s | ${CLINIC_NAME}` },
  description: "Skin and diabetes care in Chintamani, Karnataka. Contact the clinic or send an appointment request.",
  applicationName: CLINIC_NAME,
  openGraph: {
    type: "website",
    siteName: CLINIC_NAME,
    locale: "en_IN",
  },
  robots: {
    index: process.env.VERCEL_ENV !== "preview",
    follow: process.env.VERCEL_ENV !== "preview",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en-IN"><body>{children}</body></html>;
}
