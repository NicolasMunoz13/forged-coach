import { testimonials } from "@/lib/content";
import { Heading, Section } from "./ui";

export function Proof() {
  return (
    <Section id="resultados" number="03">
      <Heading
        eyebrow="Resultados"
        title="Las excusas no levantan barras"
        intro="Gente normal que dejó de negociar consigo misma. Sin filtros, sin atajos. Solo trabajo registrado."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.map((t) => (
          <figure
            key={t.name}
            className="flex flex-col rounded-2xl border border-line bg-surface p-7"
          >
            <span className="font-display w-fit rounded bg-primary/15 px-3 py-1 text-sm uppercase tracking-wide text-primary">
              {t.metric}
            </span>
            <blockquote className="mt-5 flex-1 text-lg leading-relaxed">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-6 border-t border-line pt-4">
              <span className="font-display block font-semibold uppercase">{t.name}</span>
              <span className="text-sm text-muted">{t.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
