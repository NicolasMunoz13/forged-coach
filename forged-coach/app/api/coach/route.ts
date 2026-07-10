import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { CORPUS } from "@/lib/corpus";
import type { CoachRequest, Perfil } from "@/lib/types";

// El SDK de Gemini necesita el runtime de Node (no edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Configurables por env (Vercel → Settings → Environment Variables) para poder
// cambiar de modelo sin tocar el codigo cuando Google deprecie versiones.
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const CHAT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const DIM = 768; // dimension reducida: vectores mas ligeros
const TOP_K = 4;

const SYSTEM = `Eres el Coach de FORGED, una marca de fuerza y nutricion.
Hablas en espanol, directo y sin excusas (estilo David Goggins): frases cortas,
responsabilidad personal, cero humo.
Usa SIEMPRE los datos del CONTEXTO para cifras (calorias, macros, ejercicios); no inventes numeros.
Personaliza segun la banda de IMC, la cintura y las medidas del perfil.
Si la pregunta es medica (dolor, enfermedad, medicacion), deriva a un profesional.
Termina SIEMPRE con el descargo de que es una estimacion de fitness, no consejo medico.`;

// ---------- utilidades de embeddings / cosine ----------
function normalize(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}
function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

// Embeddings del corpus: se calculan una vez por instancia (cache en modulo).
let corpusVecs: number[][] | null = null;

async function getCorpusVecs(ai: GoogleGenAI): Promise<number[][]> {
  if (corpusVecs) return corpusVecs;
  const resp = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: CORPUS.map((d) => d.text),
    config: { taskType: "RETRIEVAL_DOCUMENT", outputDimensionality: DIM },
  });
  corpusVecs = (resp.embeddings ?? []).map((e) => normalize(e.values ?? []));
  return corpusVecs;
}

async function embedQuery(ai: GoogleGenAI, text: string): Promise<number[]> {
  const resp = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { taskType: "RETRIEVAL_QUERY", outputDimensionality: DIM },
  });
  return normalize(resp.embeddings?.[0]?.values ?? []);
}

function buildUserPrompt(perfil: Perfil, pregunta: string, contexto: string): string {
  const m = perfil.medidas ?? {};
  const med = Object.entries(m)
    .filter(([, v]) => v !== undefined && v !== null && v !== 0)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "no indicadas";
  const q = pregunta?.trim() || "Dame mi plan inicial de nutricion y entrenamiento.";
  return `PERFIL DEL USUARIO (estimado por el analizador corporal):
- Banda de IMC: ${perfil.banda} (IMC ${perfil.imc ?? "?"}, confianza ${Math.round(
    (perfil.confianza ?? 0) * 100,
  )}%)
- Sexo: ${perfil.sexo || "no indicado"}
- Medidas: ${med}
- Objetivo: ${perfil.objetivo || "no indicado"}
- Restricciones: ${perfil.restricciones || "ninguna"}

CONTEXTO (usa estos datos, no inventes cifras):
${contexto}

PREGUNTA DEL USUARIO:
${q}

Responde en markdown con esta estructura exacta:
## Tu situacion
## Nutricion
## Entrenamiento
## Siguiente paso
y cierra con el descargo en una linea que empiece por '>'.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta GEMINI_API_KEY en el servidor (Vercel → Settings → Environment Variables)." },
      { status: 500 },
    );
  }

  let body: CoachRequest;
  try {
    body = (await req.json()) as CoachRequest;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }
  const { perfil, pregunta = "" } = body;
  if (!perfil?.banda) {
    return NextResponse.json({ error: "Falta 'perfil' con 'banda'." }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // RAG: recuperar los chunks mas cercanos a objetivo + pregunta + banda
    const consulta = `${perfil.objetivo || ""} ${pregunta} banda ${perfil.banda} cintura ${
      perfil.medidas?.cintura_cm ?? ""
    }`.trim();
    const [vecs, qVec] = await Promise.all([getCorpusVecs(ai), embedQuery(ai, consulta)]);

    const ranked = vecs
      .map((v, i) => ({ i, score: dot(v, qVec) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    const fuentes = ranked.map((r) => CORPUS[r.i].source);
    const contexto = ranked
      .map((r) => `[${CORPUS[r.i].source}]\n${CORPUS[r.i].text}`)
      .join("\n\n---\n\n");

    const gen = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: buildUserPrompt(perfil, pregunta, contexto),
      config: { systemInstruction: SYSTEM, temperature: 0.4, maxOutputTokens: 1000 },
    });

    return NextResponse.json({ plan: gen.text ?? "", fuentes });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `Fallo generando el plan: ${msg}` }, { status: 500 });
  }
}
