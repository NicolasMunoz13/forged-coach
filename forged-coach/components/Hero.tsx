import { hero } from "@/lib/content";
import { Button, Eyebrow } from "./ui";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* barras de "acero" decorativas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, var(--color-fg) 0 1px, transparent 1px 64px)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <Eyebrow>{hero.eyebrow}</Eyebrow>

        <h1 className="mt-6 max-w-4xl text-5xl font-bold uppercase leading-[0.95] sm:text-7xl">
          {hero.title}
          <br />
          <span className="text-primary">{hero.titleAccent}</span>
        </h1>

        <p className="mt-7 max-w-2xl text-lg text-muted sm:text-xl">{hero.subtitle}</p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Button href={hero.ctaPrimary.href}>{hero.ctaPrimary.label}</Button>
          <Button href={hero.ctaSecondary.href} variant="ghost">
            {hero.ctaSecondary.label}
          </Button>
        </div>

        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-line pt-8">
          {hero.stats.map((s) => (
            <div key={s.label}>
              <dt className="font-display text-4xl font-bold text-primary sm:text-5xl">
                {s.value}
              </dt>
              <dd className="mt-1 text-sm uppercase tracking-wide text-muted">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
