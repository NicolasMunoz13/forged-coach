"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Markdown } from "@/components/Markdown";
import type { Perfil } from "@/lib/types";

type Ej = { nombre: string; imagen?: string | null };
type Msg = { role: "user" | "assistant"; content: string; tools?: string[]; exercises?: Ej[] };

const SUGERENCIAS = [
  "Dame un plan de comidas para hoy con porciones en gramos",
  "¿Cuánta proteína hay en 150 g de pechuga de pollo?",
  "Arma mi rutina de fuerza de 3 días con ejercicios concretos",
  "¿A qué horas debería comer para perder grasa?",
];

const toolLabel: Record<string, string> = {
  buscar_alimento: "🍎 datos USDA",
  buscar_ejercicios: "🏋️ base de ejercicios",
};

export default function CoachPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("forged_perfil");
      if (raw) setPerfil(JSON.parse(raw));
    } catch {
      /* sin perfil, coach generico */
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function enviar(texto: string) {
    const pregunta = texto.trim();
    if (!pregunta || loading) return;
    setError("");
    setInput("");
    const nuevos: Msg[] = [...messages, { role: "user", content: pregunta }];
    setMessages(nuevos);
    setLoading(true);
    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil,
          messages: nuevos.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      // El servidor puede devolver una pagina de error (no-JSON) si la funcion
      // tarda demasiado; parseamos con cuidado para no romper el chat.
      const raw = await res.text();
      let data: { reply?: string; tools?: string[]; error?: string; exercises?: Ej[] };
      try {
        data = JSON.parse(raw);
      } catch {
        data = {
          error: !res.ok
            ? `El coach tardó demasiado o falló (${res.status}). Prueba una pregunta más concreta ` +
              "(por ejemplo, pide una rutina de 3 días en vez de 5)."
            : "El coach devolvió una respuesta no válida. Inténtalo de nuevo.",
        };
      }
      if (data.error || !res.ok) {
        setError(data.error || `Error ${res.status}`);
      } else {
        setMessages([
          ...nuevos,
          {
            role: "assistant",
            content: data.reply || "(sin respuesta)",
            tools: data.tools,
            exercises: data.exercises,
          },
        ]);
      }
    } catch (e) {
      setError("Fallo de red: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col px-6 py-10">
        <div className="mb-4">
          <span className="font-display text-sm uppercase tracking-[0.25em] text-primary">
            Coach IA · datos reales
          </span>
          <h1 className="mt-2 text-3xl font-bold uppercase sm:text-4xl">Habla con tu coach</h1>
          {perfil ? (
            <p className="mt-2 text-sm text-muted">
              Personalizado para ti · banda <span className="text-fg">{perfil.banda}</span>
              {perfil.imc ? ` · IMC ${perfil.imc}` : ""} · objetivo{" "}
              <span className="text-fg">{perfil.objetivo || "—"}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Consejo: haz primero tu{" "}
              <Link href="/evaluacion" className="text-primary">
                evaluación
              </Link>{" "}
              para que el plan sea a tu medida.
            </p>
          )}
        </div>

        {/* mensajes */}
        <div className="flex-1 space-y-4">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-line bg-surface p-6">
              <p className="text-muted">
                Pregúntame por comidas, porciones, horarios o tu rutina. Consulto datos reales
                (USDA para alimentos, base de ejercicios para el entreno).
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    className="rounded-full border border-line bg-bg px-3 py-1.5 text-left text-sm text-muted transition hover:border-primary hover:text-fg"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-bg">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3">
                  <Markdown>{m.content}</Markdown>

                  {m.exercises && m.exercises.length > 0 && (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                        Demostración de los ejercicios
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {m.exercises.map((ex) => (
                          <a
                            key={ex.nombre}
                            href={ex.imagen ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="group overflow-hidden rounded-lg border border-line bg-bg"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ex.imagen ?? ""}
                              alt={ex.nombre}
                              loading="lazy"
                              className="h-28 w-full bg-white object-contain"
                            />
                            <span className="block px-2 py-1.5 text-xs text-muted group-hover:text-fg">
                              {ex.nombre}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.tools && m.tools.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
                      {[...new Set(m.tools)].map((t) => (
                        <span key={t} className="text-xs text-muted">
                          {toolLabel[t] ?? t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-line bg-surface px-5 py-4">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="sticky bottom-4 mt-6 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="flex-1 rounded-full border border-line bg-surface px-5 py-3 text-fg outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="font-display rounded-full bg-primary px-6 py-3 text-sm uppercase tracking-widest text-bg transition hover:bg-primary-deep disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}
