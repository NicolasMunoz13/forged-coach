import { principles } from "@/lib/content";
import { Heading, Section } from "./ui";

export function Manifesto() {
  return (
    <Section id="mentalidad" number="00" alt>
      <Heading
        eyebrow="Mentalidad"
        title="El músculo más importante está entre las orejas"
        intro="El cuerpo solo ejecuta lo que la mente decide aguantar. Estos cuatro principios son el sistema operativo de FORGED."
      />

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
        {principles.map((p) => (
          <div key={p.n} className="bg-bg p-8 transition-colors hover:bg-surface">
            <span className="font-display text-3xl font-bold text-primary">{p.n}</span>
            <h3 className="mt-3 text-2xl font-semibold uppercase">{p.title}</h3>
            <p className="mt-3 text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
