"use client";

import { CalendarDays, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["Home", "/"],
  ["About", "/about"],
  ["Care", "/care"],
  ["Contact", "/contact"],
];

export function SiteNav() {
  const path = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        className="clinic-menu"
        type="button"
        aria-label={expanded ? "Close navigation" : "Open navigation"}
        aria-expanded={expanded}
        aria-controls="clinic-navigation"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <X aria-hidden size={24} /> : <Menu aria-hidden size={24} />}
      </button>
      <nav
        id="clinic-navigation"
        aria-label="Main navigation"
        className={expanded ? "clinic-nav is-expanded" : "clinic-nav"}
        onKeyDown={(event) => {
          if (event.key === "Escape" && expanded) {
            setExpanded(false);
            document.querySelector<HTMLButtonElement>(".clinic-menu")?.focus();
          }
        }}
      >
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            onClick={() => setExpanded(false)}
          >
            {label}
          </Link>
        ))}
        <Link
          href="/appointment"
          className="clinic-button clinic-button-primary clinic-nav-cta"
          aria-current={path === "/appointment" ? "page" : undefined}
          onClick={() => setExpanded(false)}
        >
          <CalendarDays size={17} aria-hidden /> Request appointment
        </Link>
      </nav>
    </>
  );
}
