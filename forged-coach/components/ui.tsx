import Link from "next/link";
import type { ReactNode } from "react";

/* ---------- Eyebrow / kicker ---------- */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-display inline-block text-sm uppercase tracking-[0.25em] text-primary">
      {children}
    </span>
  );
}

/* ---------- Button (link-based) ---------- */
type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

export function Button({ href, children, variant = "primary", className = "" }: ButtonProps) {
  const base =
    "font-display inline-flex items-center justify-center gap-2 px-7 py-3 text-sm uppercase tracking-widest transition-all duration-150 rounded-md";
  const styles =
    variant === "primary"
      ? "bg-primary text-bg hover:bg-primary-deep hover:-translate-y-0.5"
      : "border border-line text-fg hover:border-primary hover:text-primary";
  return (
    <Link href={href} className={`${base} ${styles} ${className}`}>
      {children}
    </Link>
  );
}

/* ---------- Section wrapper with ghost number ---------- */
type SectionProps = {
  id?: string;
  number?: string;
  children: ReactNode;
  className?: string;
  alt?: boolean;
};

export function Section({ id, number, children, className = "", alt = false }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-24 ${alt ? "bg-surface/40" : ""} ${className}`}
    >
      <div className="relative mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        {number && (
          <span className="ghost-number pointer-events-none absolute -top-6 right-4 text-7xl sm:text-9xl">
            {number}
          </span>
        )}
        {children}
      </div>
    </section>
  );
}

/* ---------- Card ---------- */
export function Card({
  children,
  className = "",
  featured = false,
}: {
  children: ReactNode;
  className?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`group rounded-2xl border bg-surface p-7 transition-all duration-200 hover:-translate-y-1 hover:border-primary ${
        featured ? "border-primary shadow-[0_0_0_1px_var(--color-primary)]" : "border-line"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ---------- Section heading ---------- */
export function Heading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: string;
}) {
  return (
    <div className="max-w-2xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-4xl font-bold uppercase sm:text-5xl">{title}</h2>
      {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
    </div>
  );
}
