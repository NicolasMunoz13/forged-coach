"use client";

import Link from "next/link";
import { useState } from "react";
import { brand, nav } from "@/lib/content";

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl font-bold uppercase tracking-wider">
          {brand.name}
          <span className="text-primary">.</span>
        </Link>

        {/* desktop */}
        <ul className="hidden items-center gap-8 md:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="font-display text-sm uppercase tracking-widest text-muted transition-colors hover:text-fg"
              >
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/evaluacion"
              className="font-display rounded-md bg-primary px-5 py-2 text-sm uppercase tracking-widest text-bg transition-colors hover:bg-primary-deep"
            >
              Coach IA
            </Link>
          </li>
        </ul>

        {/* mobile toggle */}
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden"
        >
          <span className="font-display text-sm uppercase tracking-widest text-primary">
            {open ? "Cerrar" : "Menú"}
          </span>
        </button>
      </nav>

      {/* mobile panel */}
      {open && (
        <ul className="flex flex-col gap-1 border-t border-line px-6 py-4 md:hidden">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display block py-2 text-sm uppercase tracking-widest text-muted hover:text-fg"
              >
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              href="/evaluacion"
              onClick={() => setOpen(false)}
              className="font-display mt-2 block rounded-md bg-primary px-5 py-2 text-center text-sm uppercase tracking-widest text-bg"
            >
              Coach IA
            </Link>
          </li>
        </ul>
      )}
    </header>
  );
}
