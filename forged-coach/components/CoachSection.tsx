import { coach } from "@/lib/content";
import { Button, Eyebrow, Section } from "./ui";
import { CoachEmbed } from "./CoachEmbed";

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

        <div>
          <CoachEmbed height={560} />
        </div>
      </div>
    </Section>
  );
}
