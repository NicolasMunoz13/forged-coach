import { protocols } from "@/lib/content";
import { Heading, Section } from "./ui";

export function Nutrition() {
  return (
    <Section id="nutricion" number="02" alt>
      <Heading
        eyebrow="Nutrición"
        title="No puedes superar una mala dieta entrenando"
        intro="Tres protocolos simples. No hay batidos mágicos ni detox. Hay comida real, números honestos y constancia."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {protocols.map((p, i) => (
          <div
            key={p.name}
            className="relative rounded-2xl border border-line bg-bg p-7 transition-colors hover:border-accent"
          >
            <span className="font-display absolute right-5 top-5 text-5xl font-bold text-line">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="text-xl font-bold uppercase">{p.name}</h3>
            <p className="font-display mt-2 text-sm uppercase tracking-widest text-accent">
              {p.rule}
            </p>
            <p className="mt-4 text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
