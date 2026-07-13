import Link from "next/link";
import { coach } from "@/lib/content";
import { Button, Eyebrow, Section } from "./ui";

export function CoachSection() {
  return (
    <Section id="coach" number="04" alt>
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <Eyebrow>{coach.eyebrow}</Eyebrow>
          <h2 className="mt-3 text-4xl font-bold uppercase sm:text-5xl">{coach.title}</h2>
          <p className="mt-4 text-lg text-muted">{coach.body}</p>

          <ul className="mt-6 space-y-2">
            {coach.examples.map((q) => (
              <li
                key={q}
                className="rounded-lg border border-line bg-bg px-4 py-3 text-sm text-fg/90"
              >
                <span className="mr-2 text-primary">›</span>
                {q}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button href={coach.cta.href}>{coach.cta.label}</Button>
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-2xl border border-line bg-surface p-8 text-center">
          <span className="font-display text-2xl uppercase text-primary">
            Un plan hecho para tu cuerpo
          </span>
          <p className="mt-3 text-muted">
            El analizador estima tu banda de IMC en tu navegador; el coach responde con
            <span className="text-fg"> calorías y porciones reales (USDA)</span> y una
            <span className="text-fg"> base real de ejercicios</span>. Nada de humo.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <Button href="/evaluacion">Empieza tu evaluación</Button>
            <Link
              href="/coach"
              className="font-display text-sm uppercase tracking-widest text-primary hover:underline"
            >
              o habla directo con el coach →
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
