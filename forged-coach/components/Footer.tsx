import Link from "next/link";
import { brand, nav } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="font-display text-2xl font-bold uppercase tracking-wider">
            {brand.name}
            <span className="text-primary">.</span>
          </Link>
          <p className="mt-2 max-w-xs text-sm text-muted">{brand.tagline}</p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="font-display text-sm uppercase tracking-widest text-muted hover:text-fg"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/coach"
            className="font-display text-sm uppercase tracking-widest text-muted hover:text-fg"
          >
            Coach IA
          </Link>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {brand.name}. Hecho sin excusas.
          </span>
          <span className="font-display uppercase tracking-widest text-primary">
            {brand.mantra}
          </span>
        </div>
      </div>
    </footer>
  );
}
