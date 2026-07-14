import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { functionDeclarations, runTool } from "@/lib/tools";
import type { Perfil } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Modelo del chat con tools: 'lite' es rapido (menos timeouts) y tiene cuota gratuita
// generosa. Cambiable por env (GEMINI_CHAT_MODEL) sin tocar codigo.
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-flash-lite-latest";
const MAX_STEPS = 4; // limite de rondas de tool-calling por mensaje

type ChatMsg = { role: "user" | "assistant"; content: string };

function systemPrompt(perfil: Perfil | null): string {
  const base = `Eres el Coach de FORGED, una marca de fuerza y nutricion.
Responde SIEMPRE en ESPANOL, directo y sin excusas (estilo David Goggins): frases cortas, cero humo.
Eres un COACH AGENTE con acceso a datos REALES mediante herramientas:
- Para comidas, porciones, calorias o macros: usa la tool "buscar_alimento" (base USDA). NO inventes numeros.
- Para ejercicios o planes de entrenamiento: usa la tool "buscar_ejercicios" (base real de ejercicios).
Cuando des cantidades de comida, calcula la porcion a partir de los datos por 100 g que devuelve la tool.
Puedes sugerir comidas, porciones en gramos, horarios de comidas y un plan de entrenamiento.
EFICIENCIA (importante para no tardar): agrupa las llamadas a tools en una sola tanda cuando puedas.
Para un plan de varios dias, llama a "buscar_ejercicios" como maximo 4-5 veces (los grupos principales)
y reparte esos ejercicios entre los dias. No repitas busquedas. Se conciso y directo.
COHERENCIA: elige ejercicios que peguen con el dia. Para espalda usa remos y jalones/tracciones
(no solo pullovers); para pecho, presses; para pierna, sentadillas y peso muerto. Prioriza
ejercicios multiarticulares (compound) sobre los de aislamiento.
Si la pregunta es medica (dolor, enfermedad, medicacion), deriva a un profesional.
Termina las respuestas largas con un breve descargo: es una estimacion de fitness, no consejo medico.
Usa markdown: "## " para titulos de seccion (sin vineta), "- " para listas.`;

  if (!perfil) return base;
  const m = perfil.medidas ?? {};
  const med = Object.entries(m)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return `${base}

PERFIL DEL USUARIO (estimado por el analizador corporal):
- Banda de IMC: ${perfil.banda} (IMC ${perfil.imc ?? "?"})
- Sexo: ${perfil.sexo || "no indicado"}
- Medidas: ${med || "no indicadas"}
- Objetivo: ${perfil.objetivo || "no indicado"}
- Restricciones: ${perfil.restricciones || "ninguna"}
Personaliza cada respuesta segun este perfil.`;
}

type Ejercicio = {
  nombre: string;
  imagen?: string | null;
  equipo?: string | null;
  nivel?: string | null;
};

/** Deja solo los ejercicios (con imagen) cuyo nombre aparece en la respuesta, sin repetir. */
function galeria(reply: string, exs: Ejercicio[]): Ejercicio[] {
  const low = reply.toLowerCase();
  const seen = new Set<string>();
  const out: Ejercicio[] = [];
  for (const e of exs) {
    if (!e.imagen || !e.nombre || seen.has(e.nombre)) continue;
    if (low.includes(e.nombre.toLowerCase())) {
      seen.add(e.nombre);
      out.push(e);
    }
  }
  return out.slice(0, 12);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta GEMINI_API_KEY en el servidor." }, { status: 500 });
  }

  let body: { messages?: ChatMsg[]; perfil?: Perfil | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }
  const messages = body.messages ?? [];
  if (!messages.length) {
    return NextResponse.json({ error: "Faltan 'messages'." }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey });

  // Historial -> formato Gemini (roles user/model)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const config = {
    systemInstruction: systemPrompt(body.perfil ?? null),
    temperature: 0.5,
    maxOutputTokens: 2048,
    thinkingConfig: { thinkingBudget: 0 }, // minimiza latencia (modelos con thinking)
    tools: [{ functionDeclarations }],
  };

  try {
    const toolsUsed: string[] = [];
    // Ejercicios (con imagen) que devolvieron las tools, para la galeria del chat.
    const collectedExercises: Ejercicio[] = [];

    for (let step = 0; step < MAX_STEPS; step++) {
      const resp = await ai.models.generateContent({ model: CHAT_MODEL, contents, config });
      const calls = resp.functionCalls;

      if (!calls || calls.length === 0) {
        const reply = resp.text ?? "";
        return NextResponse.json({
          reply,
          tools: toolsUsed,
          exercises: galeria(reply, collectedExercises),
        });
      }

      // Turno del modelo TAL CUAL lo devuelve: preserva el `thoughtSignature` de
      // cada functionCall, que los modelos Gemini 3 exigen al reenviar el historial.
      const modelContent = resp.candidates?.[0]?.content;
      if (modelContent) contents.push(modelContent);
      else contents.push({ role: "model", parts: calls.map((c) => ({ functionCall: c })) });

      // ejecutamos cada tool y devolvemos el resultado
      const parts = [];
      for (const c of calls) {
        toolsUsed.push(c.name ?? "tool");
        const result = await runTool(c.name ?? "", (c.args ?? {}) as Record<string, unknown>);
        if (c.name === "buscar_ejercicios") {
          const ejs = (result as { ejercicios?: Ejercicio[] })?.ejercicios ?? [];
          for (const ej of ejs) if (ej?.nombre) collectedExercises.push(ej);
        }
        parts.push({ functionResponse: { name: c.name, response: { result } } });
      }
      contents.push({ role: "user", parts });
    }
    // si agotamos los pasos, pedimos una respuesta final sin tools
    const final = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents,
      config: { ...config, tools: undefined },
    });
    const reply = final.text ?? "";
    return NextResponse.json({
      reply,
      tools: toolsUsed,
      exercises: galeria(reply, collectedExercises),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    const lower = msg.toLowerCase();
    if (lower.includes("resource_exhausted") || lower.includes("quota") || lower.includes("429")) {
      return NextResponse.json(
        {
          error:
            "Se alcanzó el límite gratuito de Gemini para este modelo. Espera un minuto e inténtalo " +
            "de nuevo, o cambia el modelo con la variable GEMINI_CHAT_MODEL en Vercel " +
            "(p. ej. gemini-flash-latest).",
        },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: `Fallo del coach: ${msg}` }, { status: 500 });
  }
}
