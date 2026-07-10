"use client";

import { useState } from "react";
import { brand, leadMagnet } from "@/lib/content";
import { Eyebrow } from "./ui";

export function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    const endpoint = process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT;
    try {
      if (endpoint) {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } else {
        // Sin backend: abrimos el cliente de correo del usuario.
        window.location.href = `mailto:${brand.email}?subject=${encodeURIComponent(
          "Quiero la Guía de las 0 Excusas",
        )}&body=${encodeURIComponent(`Mi email: ${email}`)}`;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="lead" className="scroll-mt-24 border-y border-line bg-surface/40">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
        <Eyebrow>{leadMagnet.eyebrow}</Eyebrow>
        <h2 className="mt-3 text-4xl font-bold uppercase sm:text-5xl">{leadMagnet.title}</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{leadMagnet.body}</p>

        {done ? (
          <p className="font-display mt-8 text-xl uppercase text-primary">
            Hecho. Ahora la excusa ya no es la información. {brand.mantra}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={leadMagnet.placeholder}
              className="flex-1 rounded-md border border-line bg-bg px-4 py-3 text-fg placeholder:text-muted focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="font-display rounded-md bg-primary px-7 py-3 text-sm uppercase tracking-widest text-bg transition-colors hover:bg-primary-deep disabled:opacity-60"
            >
              {loading ? "Enviando…" : leadMagnet.cta}
            </button>
          </form>
        )}
        <p className="mt-4 text-xs text-muted">
          Sin spam. Solo entrenamiento, nutrición y verdades incómodas.
        </p>
      </div>
    </section>
  );
}
