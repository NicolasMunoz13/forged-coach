import type { ReactNode } from "react";

/**
 * Renderizador markdown minimo (sin dependencias) para el plan del Coach.
 * Soporta: ## titulos, - listas, **negrita**, > cita, y parrafos.
 */
function inline(text: string): ReactNode[] {
  // **negrita**
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function Markdown({ children }: { children: string }) {
  const lines = children.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={key++} className="my-3 space-y-1.5 pl-1">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2 text-muted">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-primary" aria-hidden />
              <span>{inline(li)}</span>
            </li>
          ))}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    // Tolera que el modelo ponga una vineta antes de un titulo ("* ## Titulo").
    const line = raw.trimEnd().replace(/^[-*]\s+(?=#{1,3}\s)/, "");
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      blocks.push(
        <h3 key={key++} className="font-display mt-6 text-xl uppercase tracking-wide text-primary">
          {line.replace(/^#{1,3}\s/, "")}
        </h3>,
      );
    } else if (/^[-*]\s/.test(line)) {
      list.push(line.replace(/^[-*]\s/, ""));
    } else if (/^>\s?/.test(line)) {
      flushList();
      blocks.push(
        <blockquote
          key={key++}
          className="my-4 border-l-2 border-accent bg-surface/60 px-4 py-2 text-sm text-muted"
        >
          {inline(line.replace(/^>\s?/, ""))}
        </blockquote>,
      );
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="my-2 text-muted">
          {inline(line)}
        </p>,
      );
    }
  }
  flushList();
  return <div>{blocks}</div>;
}
