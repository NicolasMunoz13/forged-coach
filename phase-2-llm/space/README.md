---
title: FORGED Coach
emoji: 🏋️
colorFrom: green
colorTo: gray
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: cc-by-nc-4.0
---

# FORGED · Coach IA (RAG)

Coach de fitness/nutrición con **RAG** sobre datos reales. Recibe la **banda de IMC**
estimada por el analizador corporal (Fase 1) + las medidas del usuario, recupera
contexto de datasets públicos y genera un plan personalizado. Voz FORGED (Goggins).

> Estimación de fitness, **no** consejo médico.

## Configuración (gratis)
1. Crea el Space (SDK **Gradio**) y sube: `app.py`, `requirements.txt`, y —opcional—
   `corpus.json` + `corpus.faiss` (generados por `01_rag_coach.ipynb`; si no están,
   el Space reconstruye el corpus al arrancar).
2. **Settings → Secrets** → añade `GEMINI_API_KEY` (gratis en
   https://aistudio.google.com/apikey).
3. El Space arranca solo. Se embebe en la web FORGED (Fase 3) vía iframe con
   `NEXT_PUBLIC_COACH_URL`.

## Modelo LLM
- Google **Gemini `gemini-2.5-flash`** (cambia con la variable `GEMINI_MODEL`) — el
  mismo modelo/SDK (`google-genai`) que el proyecto FORGED del módulo LLM.
- CPU-only Space: la generación ocurre en la API de Gemini, no en el Space → gratis.
- Embeddings del RAG en local (MiniLM), sin consumir cuota de Gemini.

## Interfaz
Ver `../contract.md`. La UI expone los campos del `perfil` + una pregunta; en la app
real esos campos los rellena automáticamente la salida de la Fase 1.
