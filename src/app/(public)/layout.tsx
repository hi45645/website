import type { ReactNode } from "react";
import { readPublicSettings } from "@/components/public-settings";
import { SiteShell } from "@/components/site-shell";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const { phone, address } = await readPublicSettings();
  return <SiteShell phone={phone} address={address}>{children}</SiteShell>;
}
