"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Markdown } from "@/components/Markdown";
import type { Perfil } from "@/lib/types";

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "rounded-md border border-line bg-bg px-3 py-2 text-fg outline-none focus:border-primary";

const bandaColor: Record<string, string> = {
  "Bajo peso": "text-accent",
  Normal: "text-primary",
  Sobrepeso: "text-[#f5a524]",
  Obesidad: "text-danger",
};

export default function EvaluacionPage() {
  const [sexo, setSexo] = useState("male");
  const [altura, setAltura] = useState(175);
  const [peso, setPeso] = useState(84);
  const [cintura, setCintura] = useState(95);
  const [cadera, setCadera] = useState(102);
  const [pecho, setPecho] = useState(104);
  const [muslo, setMuslo] = useState(58);
  const [objetivo, setObjetivo] = useState("perder grasa manteniendo músculo");
  const [restricciones, setRestricciones] = useState("");

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [error, setError] = useState("");

  const [pregunta, setPregunta] = useState("");
  const [plan, setPlan] = useState("");
  const [fuentes, setFuentes] = useState<string[]>([]);
  const [cargandoPlan, setCargandoPlan] = useState(false);

  async function analizar() {
    setError("");
    setAnalizando(true);
    setPlan("");
    try {
      const { predecir, calcularIMC } = await import("@/lib/inference");
      const front = frontFile ? await fileToImage(frontFile) : null;
      const side = sideFile ? await fileToImage(sideFile) : null;
      const medidas = {
        altura_cm: altura,
        peso_kg: peso,
        cintura_cm: cintura,
        cadera_cm: cadera,
        pecho_cm: pecho,
        muslo_cm: muslo,
      };
      const pred = await predecir({ medidas, sexo, front, side });
      const nuevoPerfil = {
        banda: pred.banda,
        clase_idx: pred.clase_idx,
        imc: calcularIMC(altura, peso),
        confianza: pred.confianza,
        sexo,
        medidas,
        objetivo,
        restricciones,
      };
      setPerfil(nuevoPerfil);
      // guardamos el perfil para que el chat del Coach (/coach) lo use
      try {
        localStorage.setItem("forged_perfil", JSON.stringify(nuevoPerfil));
      } catch {
        /* almacenamiento no disponible */
      }
    } catch (e) {
      setError(
        "No pude cargar el modelo. ¿Está el modelo convertido en /public/model/ " +
          "(model.json + pesos + preprocess.json)? Detalle: " +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setAnalizando(false);
    }
  }

  async function generarPlan() {
    if (!perfil) return;
    setError("");
    setCargandoPlan(true);
    setPlan("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil: { ...perfil, objetivo, restricciones },
          pregunta,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error del Coach.");
      } else {
        setPlan(data.plan || "");
        setFuentes(data.fuentes || []);
      }
    } catch (e) {
      setError("Fallo de red llamando al Coach: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCargandoPlan(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-14">
        <span className="font-display text-sm uppercase tracking-[0.25em] text-primary">
          Evaluación
        </span>
        <h1 className="mt-3 text-4xl font-bold uppercase sm:text-5xl">Analiza tu cuerpo</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Sube una foto y tus medidas. El analizador estima tu banda de IMC en tu propio navegador
          (nada se sube a un servidor) y el Coach construye un plan a tu medida.{" "}
          <span className="text-fg">Es una estimación de fitness, no un diagnóstico médico.</span>
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* ---------- Columna 1: formulario ---------- */}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-display text-xl uppercase text-primary">Tus datos</h2>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Field label="Sexo">
                <select className={inputCls} value={sexo} onChange={(e) => setSexo(e.target.value)}>
                  <option value="male">Hombre</option>
                  <option value="female">Mujer</option>
                </select>
              </Field>
              <Field label="Objetivo">
                <input
                  className={inputCls}
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                />
              </Field>
              <Field label="Altura (cm)">
                <input
                  type="number"
                  className={inputCls}
                  value={altura}
                  onChange={(e) => setAltura(e.target.valueAsNumber || 0)}
                />
              </Field>
              <Field label="Peso (kg)">
                <input
                  type="number"
                  className={inputCls}
                  value={peso}
                  onChange={(e) => setPeso(e.target.valueAsNumber || 0)}
                />
              </Field>
              <Field label="Cintura (cm)">
                <input
                  type="number"
                  className={inputCls}
                  value={cintura}
                  onChange={(e) => setCintura(e.target.valueAsNumber || 0)}
                />
              </Field>
              <Field label="Cadera (cm)">
                <input
                  type="number"
                  className={inputCls}
                  value={cadera}
                  onChange={(e) => setCadera(e.target.valueAsNumber || 0)}
                />
              </Field>
              <Field label="Pecho (cm)">
                <input
                  type="number"
                  className={inputCls}
                  value={pecho}
                  onChange={(e) => setPecho(e.target.valueAsNumber || 0)}
                />
              </Field>
              <Field label="Muslo (cm)">
                <input
                  type="number"
                  className={inputCls}
                  value={muslo}
                  onChange={(e) => setMuslo(e.target.valueAsNumber || 0)}
                />
              </Field>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Foto frontal (silueta)">
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm text-muted file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-primary"
                  onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)}
                />
              </Field>
              <Field label="Foto lateral (opcional)">
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm text-muted file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-primary"
                  onChange={(e) => setSideFile(e.target.files?.[0] ?? null)}
                />
              </Field>
            </div>

            <Field label="Restricciones (opcional)">
              <input
                className={`${inputCls} mt-4`}
                placeholder="vegetariano, alergias, lesiones…"
                value={restricciones}
                onChange={(e) => setRestricciones(e.target.value)}
              />
            </Field>

            <button
              onClick={analizar}
              disabled={analizando}
              className="font-display mt-6 w-full rounded-md bg-primary px-6 py-3 text-sm uppercase tracking-widest text-bg transition hover:bg-primary-deep disabled:opacity-50"
            >
              {analizando ? "Analizando…" : "Analizar mi cuerpo"}
            </button>
          </section>

          {/* ---------- Columna 2: resultado + coach ---------- */}
          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="font-display text-xl uppercase text-primary">Resultado</h2>

            {!perfil && !error && (
              <p className="mt-5 text-muted">
                Rellena tus datos y pulsa <span className="text-fg">Analizar</span>. El resultado
                aparece aquí.
              </p>
            )}

            {error && (
              <div className="mt-5 rounded-md border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
                {error}
              </div>
            )}

            {perfil && (
              <div className="mt-5">
                <div className="rounded-xl border border-line bg-bg p-5">
                  <div className="text-sm text-muted">Banda estimada</div>
                  <div
                    className={`font-display text-3xl uppercase ${bandaColor[perfil.banda] ?? "text-fg"}`}
                  >
                    {perfil.banda}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                    <span>
                      IMC: <span className="text-fg">{perfil.imc ?? "—"}</span>
                    </span>
                    <span>
                      Confianza del modelo:{" "}
                      <span className="text-fg">{Math.round(perfil.confianza * 100)}%</span>
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    Estimación de fitness a partir de imagen + medidas. No es diagnóstico médico.
                  </p>
                </div>

                <div className="mt-5">
                  <Field label="Pregunta para el Coach (opcional)">
                    <input
                      className={inputCls}
                      placeholder="vacío = plan inicial completo"
                      value={pregunta}
                      onChange={(e) => setPregunta(e.target.value)}
                    />
                  </Field>
                  <button
                    onClick={generarPlan}
                    disabled={cargandoPlan}
                    className="font-display mt-4 w-full rounded-md border border-primary px-6 py-3 text-sm uppercase tracking-widest text-primary transition hover:bg-primary hover:text-bg disabled:opacity-50"
                  >
                    {cargandoPlan ? "El Coach está pensando…" : "Generar mi plan"}
                  </button>
                  <Link
                    href="/coach"
                    className="font-display mt-3 block w-full rounded-md bg-primary px-6 py-3 text-center text-sm uppercase tracking-widest text-bg transition hover:bg-primary-deep"
                  >
                    Sigue con el Coach →
                  </Link>
                  <p className="mt-2 text-center text-xs text-muted">
                    Chatea para comidas, porciones y tu rutina — con datos reales.
                  </p>
                </div>
              </div>
            )}

            {plan && (
              <div className="mt-6 border-t border-line pt-5">
                <Markdown>{plan}</Markdown>
                {fuentes.length > 0 && (
                  <p className="mt-4 text-xs text-muted">
                    Fuentes: {fuentes.join(" · ")}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        <p className="mt-10 text-sm text-muted">
          ¿Cómo funciona? El análisis corre con TensorFlow.js en tu navegador; el plan lo genera el
          Coach (RAG con Gemini) desde el servidor.{" "}
          <Link href="/" className="text-primary">
            Volver al inicio
          </Link>
        </p>
      </main>
      <Footer />
    </>
  );
}
