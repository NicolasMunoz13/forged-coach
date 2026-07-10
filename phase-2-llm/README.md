# Fase 2 · Coach LLM (RAG + fine-tune)

Componente de **LLM / AI Engineering** del proyecto FORGED. Genera planes de nutrición
y entrenamiento personalizados, consumiendo la **banda de IMC** que estima la Fase 1.

## Archivos
| Archivo | Qué es |
|---|---|
| `contract.md` | **Contrato de interfaces** entre Fase 1 ↔ Coach ↔ Fase 3 (el JSON `perfil`). |
| `01_rag_coach.ipynb` | Núcleo: corpus RAG + embeddings + FAISS + prompt contract + `coach()` + evaluación. |
| `02_finetune_qlora.ipynb` | Extra: fine-tune QLoRA sobre datos reales (la cabecera "entrenado con datos reales"). |
| `space/` | HF Space (Gradio) desplegable: el coach en vivo que embebe la web. |
| `build_notebooks.py` | Genera los dos notebooks (JSON válido, reproducible). |

## Arquitectura (y por qué es toda gratis)
```
perfil (Fase 1: banda IMC + medidas) + pregunta
              │
      retrieve() ── FAISS + MiniLM (local, gratis) ── corpus real (fitness-qa + dietary)
              │
      build_user_prompt()  ── persona FORGED + contexto
              │
      llm_chat()  ── Google Gemini API · gemini-2.5-flash (free tier)  →  plan markdown
```
- **Embeddings + índice**: locales (MiniLM + FAISS), sin coste ni cuota.
- **Generación**: **Google Gemini** (`gemini-2.5-flash`, SDK `google-genai`) — el mismo
  que el proyecto FORGED del módulo LLM. Los Spaces gratuitos son CPU-only, así que la
  generación ocurre en la API de Gemini, no en el Space.
- **Fine-tune QLoRA**: Colab T4 gratis; el adapter (unos MB) se sube al Hub como
  artefacto. No se sirve en vivo (servir un modelo propio gratis 24/7 no es fiable);
  el coach en producción usa RAG+API.

## Cómo ejecutarlo
1. **Notebook RAG** (`01_rag_coach.ipynb`) en Colab: añade `GEMINI_API_KEY` en los
   secretos de Colab y ejecuta de arriba abajo. Genera `corpus.json` + `corpus.faiss`.
2. **Notebook QLoRA** (`02_finetune_qlora.ipynb`, opcional) en Colab con GPU: entrena
   el adapter y súbelo al Hub (necesita `HF_TOKEN` y cambiar `OUTPUT_REPO`).
3. **Space**: sube `space/` a un Hugging Face Space (SDK Gradio) + el secret
   `GEMINI_API_KEY`. Copia su URL → será `NEXT_PUBLIC_COACH_URL` en la Fase 3.

## Datasets (verificados) y licencias
- `hammamwahab/fitness-qa` — `context`, `question`, `answer`.
- `issai/LLM_for_Dietary_Recommendation_System` — `text`.
- `onurSakar/GYM-Exercise` — `text` (`[INST]…[/INST]`), alternativa para el fine-tune.

Cita los datasets en la presentación y respeta sus licencias (uso académico).

## Caveats honestos
- **No he ejecutado** los notebooks (sin GPU/keys aquí): validados estáticamente
  (sintaxis + JSON). La primera ejecución real es en Colab.
- Las APIs de `trl`/`peft` cambian entre versiones; el notebook QLoRA marca dónde
  ajustar si `SFTConfig`/`SFTTrainer` se queja de argumentos.
- Los free tiers tienen cuotas (Gemini) y cold-starts (Space): menciónalos como límites
  conocidos en la ronda de preguntas.
