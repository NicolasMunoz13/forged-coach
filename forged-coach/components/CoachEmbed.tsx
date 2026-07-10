import { Button } from "./ui";

/**
 * Embebe el HF Space del Coach IA (RAG) si NEXT_PUBLIC_COACH_URL está definido.
 * Si no, muestra un fallback honesto (sin pantalla en blanco).
 */
export function CoachEmbed({ height = 640 }: { height?: number }) {
  const url = process.env.NEXT_PUBLIC_COACH_URL;

  if (!url) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-line bg-surface p-10 text-center"
        style={{ minHeight: height }}
      >
        <span className="font-display text-xl uppercase text-primary">
          El Coach se está calentando
        </span>
        <p className="max-w-md text-muted">
          Conecta el Space de Hugging Face definiendo{" "}
          <code className="rounded bg-bg px-2 py-1 text-accent">NEXT_PUBLIC_COACH_URL</code> en{" "}
          <code className="rounded bg-bg px-2 py-1 text-accent">.env.local</code>. Mientras
          tanto, deja de buscar excusas y empieza por un programa.
        </p>
        <Button href="#programas">Ver programas</Button>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      title="Coach IA FORGED"
      className="w-full rounded-2xl border border-line bg-surface"
      style={{ height }}
      allow="clipboard-write; microphone"
    />
  );
}
