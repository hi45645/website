import type { MetadataRoute } from "next";
import { siteUrl } from "@/components/clinic";

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.VERCEL_ENV === "preview") return [];
  return ["/", "/about", "/care", "/appointment", "/contact", "/privacy"].map((page) => ({
    url: new URL(page, siteUrl()).href,
  }));
}
