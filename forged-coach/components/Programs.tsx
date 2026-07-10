import { programs } from "@/lib/content";
import { Button, Card, Heading, Section } from "./ui";

export function Programs() {
  return (
    <Section id="programas" number="01">
      <Heading
        eyebrow="Programas"
        title="Elige tu campo de batalla"
        intro="Tres programas. Cero relleno. Cada uno te dice exactamente qué hacer cada día. Lo único que pones tú es presentarte."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {programs.map((p) => (
          <Card key={p.name} featured={p.featured} className="flex flex-col">
            {p.featured && (
              <span className="font-display mb-4 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs uppercase tracking-widest text-bg">
                El más elegido
              </span>
            )}
            <h3 className="text-2xl font-bold uppercase">{p.name}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-muted">
              <span className="rounded border border-line px-2 py-1">{p.level}</span>
              <span className="rounded border border-line px-2 py-1">{p.weeks} semanas</span>
              <span className="rounded border border-line px-2 py-1">{p.days}</span>
            </div>

            <p className="mt-4 text-muted">{p.pitch}</p>

            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex items-center justify-between border-t border-line pt-5">
              <span className="font-display text-3xl font-bold">{p.price}</span>
              <Button href="#lead" variant={p.featured ? "primary" : "ghost"}>
                Lo quiero
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}
