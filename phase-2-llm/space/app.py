# -*- coding: utf-8 -*-
"""
FORGED Coach · Hugging Face Space (Gradio)
Coach de fitness con RAG. Recibe el perfil estimado por la Fase 1 (banda de IMC +
medidas) y una pregunta, recupera contexto de datasets reales y genera un plan.

Despliegue GRATIS: Space CPU-only. LLM via Google Gemini (tier gratuito).
Secreto necesario en el Space: GEMINI_API_KEY.

Contrato de datos: ../contract.md
"""
import os
import json
import numpy as np
import gradio as gr
from google import genai
from google.genai import types

CHAT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

# Cliente perezoso: no se crea hasta la primera llamada, para que el Space arranque
# aunque falte el secret (y muestre un mensaje claro pidiendolo).
_CLIENT = None


def _client():
    global _CLIENT
    if _CLIENT is None:
        _CLIENT = genai.Client()   # lee GEMINI_API_KEY del entorno
    return _CLIENT

# --------------------------------------------------------------------------
#  1. Corpus + indice (se cargan de disco si existen; si no, se reconstruyen)
# --------------------------------------------------------------------------
from sentence_transformers import SentenceTransformer
import faiss

EMBEDDER = SentenceTransformer("all-MiniLM-L6-v2")


def _build_corpus():
    """Reconstruye el corpus desde los datasets si no hay ficheros cacheados."""
    from datasets import load_dataset
    docs = []
    fq = load_dataset("hammamwahab/fitness-qa", split="train")
    for r in fq:
        q = (r.get("question") or "").strip()
        a = (r.get("answer") or "").strip()
        ctx = (r.get("context") or "").strip()
        if a:
            docs.append(f"P: {q}\nR: {a}")
        if len(ctx) > 80:
            docs.append(ctx)
    diet = load_dataset("issai/LLM_for_Dietary_Recommendation_System", split="train")
    for r in diet:
        t = (r.get("text") or "").strip()
        if t:
            docs.append(t)

    def chunk(text, size=800, overlap=100):
        if len(text) <= size:
            return [text]
        out, i = [], 0
        while i < len(text):
            out.append(text[i:i + size])
            i += size - overlap
        return out

    chunks = []
    for d in docs:
        chunks.extend(chunk(d))
    chunks = [x.strip() for x in chunks if len(x.strip()) > 40]
    return list(dict.fromkeys(chunks))


def load_index():
    if os.path.exists("corpus.json") and os.path.exists("corpus.faiss"):
        chunks = json.load(open("corpus.json"))
        index = faiss.read_index("corpus.faiss")
        return chunks, index
    chunks = _build_corpus()
    emb = EMBEDDER.encode(chunks, batch_size=64, normalize_embeddings=True).astype("float32")
    index = faiss.IndexFlatIP(emb.shape[1])
    index.add(emb)
    return chunks, index


CHUNKS, INDEX = load_index()


def retrieve(query, k=4):
    q = EMBEDDER.encode([query], normalize_embeddings=True).astype("float32")
    _, ids = INDEX.search(q, k)
    return [CHUNKS[i] for i in ids[0]]


# --------------------------------------------------------------------------
#  2. LLM (Google Gemini) + persona FORGED
# --------------------------------------------------------------------------
SYSTEM = (
    "Eres el Coach de FORGED, una marca de fuerza y nutricion. "
    "Hablas en espanol, directo y sin excusas (estilo David Goggins): frases cortas, "
    "responsabilidad personal, cero humo. "
    "Usa SIEMPRE los datos del CONTEXTO para cifras (calorias, macros, ejercicios); "
    "no inventes numeros. Personaliza segun la banda de IMC y las medidas del perfil. "
    "Si la pregunta es medica (dolor, enfermedad, medicacion), deriva a un profesional. "
    "Termina SIEMPRE con el descargo de que es una estimacion de fitness, no consejo medico."
)


def llm_chat(system, user, temperature=0.4, max_tokens=900):
    resp = _client().models.generate_content(
        model=CHAT_MODEL,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens),
    )
    return resp.text


def build_user_prompt(perfil, pregunta, contexto):
    med = perfil.get("medidas", {})
    med_str = ", ".join(f"{k}={v}" for k, v in med.items()) or "no indicadas"
    pregunta = pregunta or "Dame mi plan inicial de nutricion y entrenamiento."
    return (
        "PERFIL DEL USUARIO (estimado por el analizador corporal):\n"
        f"- Banda de IMC: {perfil.get('banda','?')} (IMC {perfil.get('imc','?')})\n"
        f"- Sexo: {perfil.get('sexo','no indicado')}\n"
        f"- Medidas: {med_str}\n"
        f"- Objetivo: {perfil.get('objetivo','no indicado')}\n"
        f"- Restricciones: {perfil.get('restricciones','ninguna')}\n\n"
        "CONTEXTO (usa estos datos, no inventes cifras):\n"
        f"{contexto}\n\n"
        f"PREGUNTA DEL USUARIO:\n{pregunta}\n\n"
        "Responde en markdown con esta estructura exacta:\n"
        "## Tu situacion\n## Nutricion\n## Entrenamiento\n## Siguiente paso\n"
        "y cierra con el descargo en una linea que empiece por '>'."
    )


def coach(perfil, pregunta=""):
    consulta = f"{perfil.get('objetivo','')} {pregunta} banda {perfil.get('banda','')}"
    contexto = "\n\n---\n\n".join(retrieve(consulta, k=4))
    return llm_chat(SYSTEM, build_user_prompt(perfil, pregunta, contexto))


# --------------------------------------------------------------------------
#  3. UI Gradio (embebible por iframe en la web FORGED)
# --------------------------------------------------------------------------
def responder(banda, imc, sexo, altura, peso, cintura, objetivo, restricciones, pregunta):
    if not os.environ.get("GEMINI_API_KEY"):
        return ("**Falta la API key.** Anade `GEMINI_API_KEY` en los *Settings → "
                "Secrets* de este Space (gratis en https://aistudio.google.com/apikey).")
    perfil = {
        "banda": banda, "imc": imc, "sexo": sexo,
        "medidas": {"altura_cm": altura, "peso_kg": peso, "cintura_cm": cintura},
        "objetivo": objetivo, "restricciones": restricciones,
    }
    try:
        return coach(perfil, pregunta)
    except Exception as e:
        return f"Error generando el plan: {e}"


with gr.Blocks(title="FORGED Coach", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# FORGED · Coach IA\nEstimacion de fitness, **no** consejo medico.")
    with gr.Row():
        with gr.Column(scale=1):
            banda = gr.Dropdown(["Bajo peso", "Normal", "Sobrepeso", "Obesidad"],
                                value="Sobrepeso", label="Banda de IMC (de la Fase 1)")
            imc = gr.Number(value=27.3, label="IMC (opcional)")
            sexo = gr.Dropdown(["male", "female"], value="male", label="Sexo")
            altura = gr.Number(value=175, label="Altura (cm)")
            peso = gr.Number(value=84, label="Peso (kg)")
            cintura = gr.Number(value=95, label="Cintura (cm)")
            objetivo = gr.Textbox(value="perder grasa manteniendo musculo",
                                  label="Objetivo")
            restricciones = gr.Textbox(value="", label="Restricciones (opcional)")
            pregunta = gr.Textbox(value="", label="Pregunta (vacio = plan inicial)")
            btn = gr.Button("Generar plan", variant="primary")
        with gr.Column(scale=2):
            salida = gr.Markdown()
    btn.click(responder,
              [banda, imc, sexo, altura, peso, cintura, objetivo, restricciones, pregunta],
              salida)

if __name__ == "__main__":
    demo.launch()
