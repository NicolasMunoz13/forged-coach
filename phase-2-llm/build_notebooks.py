# -*- coding: utf-8 -*-
"""
Genera los notebooks de la Fase 2 (Coach LLM):
  - 01_rag_coach.ipynb        (RAG + prompt contract + eval)  <- nucleo fiable
  - 02_finetune_qlora.ipynb   (fine-tune QLoRA, la cabecera "datos reales")
Ejecutar:  python build_notebooks.py
"""
import json


def new():
    return []

def md(cells, text):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": text})

def code(cells, text):
    cells.append({"cell_type": "code", "metadata": {}, "execution_count": None,
                  "outputs": [], "source": text})

def write(cells, path):
    nb = {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.10"},
            "colab": {"provenance": [], "toc_visible": True},
            "accelerator": "GPU",
        },
        "nbformat": 4, "nbformat_minor": 4,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(nb, f, ensure_ascii=False, indent=1)
    print(f"Escrito {path} ({len(cells)} celdas)")


# =====================================================================
#  NOTEBOOK 1 · RAG COACH
# =====================================================================
c = new()

md(c, r"""# Fase 2 · Coach LLM con RAG

## FORGED · Multimodal Fitness Coach — componente de AI Engineering

Este notebook construye el **Coach**: un asistente que genera planes de nutricion y
entrenamiento personalizados. Es la parte de **LLM** del proyecto y se conecta con la
**Fase 1** (Deep Learning): recibe la **banda de IMC** estimada por el analizador
corporal y la usa como contexto.

Tecnicas del modulo LLM que aplicamos:
- **RAG** (M19): recuperamos informacion real de datasets de fitness/nutricion antes
  de responder, para no inventar cifras.
- **Prompt engineering** (M12): persona FORGED (voz Goggins) + contrato de entrada.
- **Evaluacion de RAG** (M20): medimos fidelidad y relevancia de las respuestas.

> Todo con herramientas **gratuitas**: embeddings locales (MiniLM) + FAISS + un LLM
> via **Google Gemini** (`gemini-2.5-flash`, tier gratuito) — el mismo modelo y SDK
> (`google-genai`) que ya usa el proyecto FORGED del modulo LLM.

**Contrato de datos:** ver `contract.md`. El coach recibe un `perfil` (salida de la
Fase 1) y una `pregunta`, y devuelve un plan en markdown.
""")

md(c, r"""---
## 1. Instalacion y clave

Necesitas una API key **gratuita** de Google AI Studio
(https://aistudio.google.com/apikey). En Colab, guardala en el panel de **secretos**
(icono de la llave) como `GEMINI_API_KEY`.""")

code(c, r"""!pip -q install google-genai sentence-transformers faiss-cpu datasets

import os, json, re
import numpy as np

# --- Clave Gemini: en Colab desde 'secrets'; si no, por teclado ---
if not os.environ.get("GEMINI_API_KEY"):
    try:
        from google.colab import userdata
        os.environ["GEMINI_API_KEY"] = userdata.get("GEMINI_API_KEY") or ""
    except Exception:
        import getpass
        os.environ["GEMINI_API_KEY"] = getpass.getpass("GEMINI_API_KEY: ")

from google import genai
from google.genai import types
GENAI = genai.Client()   # lee GEMINI_API_KEY del entorno
print("Gemini listo.")""")

md(c, r"""---
## 2. Generacion con Gemini

Una sola funcion `llm_chat(system, user)` sobre el SDK `google-genai` (mismo patron que
el proyecto FORGED). El modelo `gemini-2.5-flash` es gratuito y rapido.""")

code(c, r"""CHAT_MODEL = "gemini-2.5-flash"   # mismo modelo que el proyecto FORGED del modulo LLM

def llm_chat(system, user, temperature=0.4, max_tokens=900, model=CHAT_MODEL):
    resp = GENAI.models.generate_content(
        model=model,
        contents=user,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_tokens),
    )
    return resp.text

# Prueba rapida
print(llm_chat("Responde en una frase.", "Di 'coach listo' si me lees."))""")

md(c, r"""---
## 3. Corpus RAG desde datos reales

Construimos el corpus con dos datasets publicos de Hugging Face (esquema verificado):

| Dataset | Columnas | Uso |
|---|---|---|
| `hammamwahab/fitness-qa` | `context`, `question`, `answer` | Q&A de fitness |
| `issai/LLM_for_Dietary_Recommendation_System` | `text` | planes dieteticos |""")

code(c, r"""from datasets import load_dataset

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

# Troceado simple de documentos largos (los planes dieteticos son extensos)
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

# Limpieza + deduplicado
chunks = [x.strip() for x in chunks if len(x.strip()) > 40]
chunks = list(dict.fromkeys(chunks))
print(f"Documentos: {len(docs)}  ->  chunks para el indice: {len(chunks)}")
print("\nEjemplo de chunk:\n", chunks[0][:300])""")

md(c, r"""---
## 4. Embeddings + indice FAISS

Vectorizamos los chunks con `all-MiniLM-L6-v2` (local, gratis) y los indexamos con
FAISS por similitud coseno (producto interno sobre vectores normalizados).""")

code(c, r"""from sentence_transformers import SentenceTransformer
import faiss

embedder = SentenceTransformer("all-MiniLM-L6-v2")
emb = embedder.encode(chunks, batch_size=64, show_progress_bar=True,
                      normalize_embeddings=True).astype("float32")

index = faiss.IndexFlatIP(emb.shape[1])
index.add(emb)
print("Indice FAISS con", index.ntotal, "vectores de dim", emb.shape[1])

def retrieve(query, k=4):
    q = embedder.encode([query], normalize_embeddings=True).astype("float32")
    scores, ids = index.search(q, k)
    return [chunks[i] for i in ids[0]]

# Prueba
for d in retrieve("cuantas proteinas para ganar musculo", k=2):
    print("-", d[:160].replace("\n", " "), "...")""")

md(c, r"""---
## 5. Prompt contract · persona FORGED

La persona (voz Goggins, español, descargo medico) y el prompt de usuario que inyecta
el **perfil** de la Fase 1 + el **contexto** recuperado. Ver `contract.md`.""")

code(c, r"""SYSTEM = (
    "Eres el Coach de FORGED, una marca de fuerza y nutricion. "
    "Hablas en espanol, directo y sin excusas (estilo David Goggins): frases cortas, "
    "responsabilidad personal, cero humo. "
    "Usa SIEMPRE los datos del CONTEXTO para cifras (calorias, macros, ejercicios); "
    "no inventes numeros. Personaliza segun la banda de IMC y las medidas del perfil. "
    "Si la pregunta es medica (dolor, enfermedad, medicacion), deriva a un profesional. "
    "Termina SIEMPRE con el descargo de que es una estimacion de fitness, no consejo medico."
)

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
    )""")

md(c, r"""---
## 6. La funcion `coach()` (RAG end-to-end)

Recupera contexto segun objetivo+pregunta, arma el prompt e invoca el LLM.""")

code(c, r"""def coach(perfil, pregunta=""):
    consulta = f"{perfil.get('objetivo','')} {pregunta} banda {perfil.get('banda','')}"
    contexto = "\n\n---\n\n".join(retrieve(consulta, k=4))
    return llm_chat(SYSTEM, build_user_prompt(perfil, pregunta, contexto))

# --- DEMO: simulamos la salida de la Fase 1 (ver contract.md) ---
perfil_demo = {
    "banda": "Sobrepeso", "clase_idx": 2, "imc": 27.3, "confianza": 0.71,
    "sexo": "male",
    "medidas": {"altura_cm": 175, "peso_kg": 84.0, "cintura_cm": 95},
    "objetivo": "perder grasa manteniendo musculo",
    "restricciones": "vegetariano",
}
print(coach(perfil_demo))""")

code(c, r"""# Otra consulta de seguimiento sobre el mismo perfil
print(coach(perfil_demo, "que desayuno me recomiendas?"))""")

md(c, r"""---
## 7. Evaluacion del RAG (estilo M20)

Evaluacion ligera con un **LLM como juez**: para varias preguntas medimos
**fidelidad** (¿la respuesta se apoya en el contexto?) y **relevancia** (¿responde a
la pregunta?), de 1 a 5. Es la version compacta de RAGAs; al final indicamos como
correr RAGAs completo.""")

code(c, r"""PREGUNTAS_EVAL = [
    "cuanta proteina al dia para ganar musculo",
    "puedo perder grasa y ganar musculo a la vez",
    "que hago si me estanco perdiendo peso",
    "cuantos dias de fuerza a la semana para empezar",
]

JUEZ = (
    "Eres un evaluador estricto de sistemas RAG. Devuelve SOLO un JSON "
    '{"fidelidad": n, "relevancia": n} con enteros de 1 a 5. '
    "fidelidad: cuanto se apoya la respuesta en el contexto (5=todo, 1=inventado). "
    "relevancia: cuanto responde a la pregunta."
)

def evaluar(pregunta):
    ctx = "\n\n".join(retrieve(pregunta, k=4))
    resp = llm_chat(SYSTEM, build_user_prompt(perfil_demo, pregunta, ctx))
    j = llm_chat(JUEZ,
                 f"PREGUNTA:\n{pregunta}\n\nCONTEXTO:\n{ctx}\n\nRESPUESTA:\n{resp}",
                 temperature=0.0, max_tokens=60)
    try:
        m = re.search(r"\{.*\}", j, re.S)
        return json.loads(m.group(0))
    except Exception:
        return {"fidelidad": None, "relevancia": None}

resultados = {p: evaluar(p) for p in PREGUNTAS_EVAL}
for p, s in resultados.items():
    print(f"  {s}  <- {p}")

vals_f = [s["fidelidad"] for s in resultados.values() if s.get("fidelidad")]
vals_r = [s["relevancia"] for s in resultados.values() if s.get("relevancia")]
if vals_f:
    print(f"\nMedia fidelidad: {np.mean(vals_f):.2f}/5 | relevancia: {np.mean(vals_r):.2f}/5")""")

md(c, r"""> **RAGAs completo (opcional, M20):** `pip install ragas` y usa `faithfulness`,
> `answer_relevancy`, `context_precision` sobre un `Dataset` con columnas
> `question`, `answer`, `contexts`, `ground_truth`. Requiere configurar un LLM juez.
> La version de arriba cubre lo esencial sin dependencias fragiles.""")

md(c, r"""---
## 8. Exportacion para el Space (Fase 3)

Guardamos el corpus y el indice para que el Hugging Face Space los reutilice sin
reconstruirlos (arranque mas rapido).""")

code(c, r"""json.dump(chunks, open("corpus.json", "w"), ensure_ascii=False)
faiss.write_index(index, "corpus.faiss")
print("Guardado: corpus.json (", len(chunks), "chunks ) + corpus.faiss")
print("Subelos al HF Space junto a app.py (ver carpeta space/).")""")

md(c, r"""---
## 9. Conclusiones y handoff

- **RAG funcionando** sobre datos reales de fitness/nutricion, con generacion via LLM
  gratuito y persona FORGED.
- **Contrato con la Fase 1**: `coach(perfil, pregunta)` consume la banda de IMC.
- **Evaluado** con un juez LLM (fidelidad/relevancia) — base para la ronda de preguntas.

**Handoff a Fase 3:** el codigo de `coach()` vive en `space/app.py` (Gradio) y se
embebe en la web FORGED via `NEXT_PUBLIC_COACH_URL`.

**Siguiente (opcional):** `02_finetune_qlora.ipynb` adapta un modelo abierto con datos
reales — la cabecera de "entrenado con datos reales" del proyecto.

### Referencias
- Datasets: `hammamwahab/fitness-qa`, `issai/LLM_for_Dietary_Recommendation_System` (HF).
- Modulo LLM / AI Engineering — KeepCoding (M12 prompt, M19 RAG, M20 evaluacion).
""")

write(c, "01_rag_coach.ipynb")


# =====================================================================
#  NOTEBOOK 2 · QLoRA FINE-TUNE
# =====================================================================
c = new()

md(c, r"""# Fase 2 (extra) · Fine-tune QLoRA del Coach

## "Entrenado con datos reales" — la cabecera del proyecto

Adaptamos un modelo abierto pequeno (**Qwen2.5-1.5B-Instruct**) con **QLoRA** (4-bit +
LoRA) sobre datos reales de fitness, para que responda con el formato y tono del coach.
Es la misma tecnica del modulo LLM (M14, "Hablar como Milei").

> **GPU gratis:** Colab T4 (Entorno de ejecucion → GPU). QLoRA en 4-bit cabe de sobra.

> **Nota de arquitectura (honesta):** servir un modelo fine-tuneado 24/7 gratis es
> dificil (los Spaces gratuitos son solo-CPU). Por eso **el coach en produccion usa
> RAG + API gratuita** (notebook 01). Este fine-tune es el **artefacto entrenado** +
> su evaluacion: se sube el adapter al Hub y se demuestra en la presentacion.""")

md(c, r"""---
## 1. Instalacion

> Las APIs de `trl`/`peft` cambian entre versiones. Si `SFTConfig`/`SFTTrainer` diera
> un error de argumentos, ajusta segun la version instalada (se indica abajo).""")

code(c, r"""!pip -q install -U transformers peft trl bitsandbytes accelerate datasets

import os, torch
from datasets import load_dataset
print("CUDA disponible:", torch.cuda.is_available())

# Token de HF para subir el adapter (Colab secrets -> HF_TOKEN)
try:
    from google.colab import userdata
    os.environ.setdefault("HF_TOKEN", userdata.get("HF_TOKEN") or "")
except Exception:
    pass

MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct"
OUTPUT_REPO = "TU_USUARIO/forged-coach-qlora"   # <- cambia por tu usuario de HF""")

md(c, r"""---
## 2. Modelo base en 4-bit (QLoRA)""")

code(c, r"""from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import LoraConfig, prepare_model_for_kbit_training

bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID, quantization_config=bnb, device_map="auto")
model = prepare_model_for_kbit_training(model)

lora = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05, bias="none",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    task_type="CAUSAL_LM")
print("Modelo base cargado en 4-bit.")""")

md(c, r"""---
## 3. Datos reales → formato chat

Usamos `hammamwahab/fitness-qa` (pregunta → respuesta). Aplicamos el chat template de
Qwen con la misma persona FORGED, para que el modelo aprenda el tono y el formato.""")

code(c, r"""SYS = ("Eres el Coach de FORGED. Respondes en espanol, directo y sin excusas, "
       "con datos concretos de fitness y nutricion. Cierras con un descargo de que "
       "es informacion de fitness, no consejo medico.")

raw = load_dataset("hammamwahab/fitness-qa", split="train")

def to_text(ex):
    msgs = [
        {"role": "system", "content": SYS},
        {"role": "user", "content": (ex.get("question") or "").strip()},
        {"role": "assistant", "content": (ex.get("answer") or "").strip()},
    ]
    return {"text": tokenizer.apply_chat_template(msgs, tokenize=False)}

ds = raw.filter(lambda e: (e.get("answer") or "").strip() != "").map(
    to_text, remove_columns=raw.column_names)
print("Ejemplos de entrenamiento:", len(ds))
print(ds[0]["text"][:400])""")

md(c, r"""---
## 4. Entrenamiento (SFT + LoRA)

Pocos pasos: es una demostracion de que el pipeline funciona y el modelo adopta el
estilo. Sube `max_steps` si quieres afinar mas.""")

code(c, r"""from trl import SFTConfig, SFTTrainer

cfg = SFTConfig(
    output_dir="forged-qlora",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    max_steps=120,
    learning_rate=2e-4,
    logging_steps=10,
    bf16=True,
    lr_scheduler_type="cosine",
    warmup_ratio=0.03,
    dataset_text_field="text",
    max_seq_length=1024,
    report_to="none",
)

trainer = SFTTrainer(model=model, train_dataset=ds, args=cfg, peft_config=lora)
trainer.train()
print("Entrenamiento terminado.")""")

md(c, r"""---
## 5. Prueba: ¿responde como el coach?""")

code(c, r"""def generar(pregunta, max_new_tokens=220):
    msgs = [{"role": "system", "content": SYS},
            {"role": "user", "content": pregunta}]
    ids = tokenizer.apply_chat_template(
        msgs, add_generation_prompt=True, return_tensors="pt").to(model.device)
    out = model.generate(ids, max_new_tokens=max_new_tokens,
                         temperature=0.4, do_sample=True,
                         pad_token_id=tokenizer.pad_token_id)
    return tokenizer.decode(out[0][ids.shape[1]:], skip_special_tokens=True)

print(generar("Tengo sobrepeso y quiero empezar. Dame 3 reglas de nutricion."))""")

md(c, r"""---
## 6. Subir el adapter al Hub

Solo se suben los pesos LoRA (unos MB). Este repo es el artefacto "entrenado con datos
reales" que se ensena en la presentacion.""")

code(c, r"""# Requiere HF_TOKEN con permiso de escritura
if os.environ.get("HF_TOKEN"):
    trainer.model.push_to_hub(OUTPUT_REPO, token=os.environ["HF_TOKEN"])
    tokenizer.push_to_hub(OUTPUT_REPO, token=os.environ["HF_TOKEN"])
    print("Adapter subido a:", OUTPUT_REPO)
else:
    print("Define HF_TOKEN para subir el adapter. Guardado localmente en forged-qlora/.")
    trainer.model.save_pretrained("forged-qlora-adapter")""")

md(c, r"""---
## 7. Conclusiones

- Fine-tune **QLoRA** real sobre datos reales de fitness, en GPU gratuita.
- El modelo adopta el **tono y formato** del coach (evaluable comparando antes/despues).
- Adapter publicado en el Hub como evidencia.

**Que defender:** por que QLoRA (barato, cabe en 4-bit), diferencia con RAG (el RAG
aporta cifras actualizadas y evita alucinaciones; el fine-tune aporta estilo/formato),
y por que en produccion servimos RAG+API (gratis y fiable) reservando el fine-tune como
artefacto entrenado.

### Referencias
- `hammamwahab/fitness-qa` (HF). Qwen2.5 (Alibaba). PEFT/TRL/bitsandbytes (HF).
- Modulo LLM — KeepCoding (M14 fine-tuning / QLoRA).
""")

write(c, "02_finetune_qlora.ipynb")
