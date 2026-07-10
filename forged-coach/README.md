# FORGED · Multimodal Fitness Coach (app web)

App del proyecto final, **consolidada en Vercel** (Hugging Face dejó de ofrecer
Spaces de compute gratis). Une las dos mitades del proyecto en una sola web:

- **Analizador corporal (Fase 1)** → corre **en el navegador** con TensorFlow.js.
  El modelo entrenado se convierte a tfjs y se sirve desde `public/model/`.
- **Coach LLM (Fase 2)** → **API route** (`app/api/coach`) con RAG (Gemini embeddings
  + `gemini-2.5-flash`) sobre un corpus curado (`lib/corpus.ts`).

Nada de servidores de pago: Vercel (hobby, gratis) + Gemini (free tier) + inferencia
en el cliente. Estimación de fitness, **no** consejo médico.

## Flujo
```
/evaluacion  ── formulario + foto
      │  (navegador)
   TF.js: model.predict  →  banda de IMC + confianza  →  perfil
      │  POST /api/coach
   Gemini embeddings (RAG) + gemini-2.5-flash  →  plan en markdown
```

## Estructura
| Ruta | Qué es |
|---|---|
| `app/page.tsx` | Landing FORGED (reutilizada del módulo LLM). |
| `app/evaluacion/page.tsx` | **Nuevo**: análisis en el navegador + coach + plan. |
| `app/api/coach/route.ts` | **Nuevo**: RAG + Gemini (servidor). |
| `lib/inference.ts` | Carga y ejecuta el modelo tfjs en el cliente. |
| `lib/corpus.ts` | Base de conocimiento del coach (RAG). |
| `lib/types.ts` | Contrato `Perfil` compartido. |
| `public/model/` | Aquí va el modelo convertido (ver su README). |

## Puesta en marcha (local)
```bash
npm install
cp .env.example .env.local     # y pon tu GEMINI_API_KEY
npm run dev                     # http://localhost:3000/evaluacion
```
Consigue la key gratis en https://aistudio.google.com/apikey.

Para que "Analizar" funcione, coloca el modelo en `public/model/` (lo genera
`phase-1-dl/02_export_tfjs.ipynb`). Sin él, la web compila y el coach funciona; solo
el análisis pedirá el modelo.

## Desplegar en Vercel (gratis)
1. Sube este proyecto a un repo de GitHub.
2. En https://vercel.com → **New Project** → importa el repo.
   - Si el repo tiene varias carpetas, pon **Root Directory** = `9. Proyecto Final/forged-coach`.
3. **Environment Variables** → añade `GEMINI_API_KEY`.
4. **Deploy**. Vercel te da la URL pública (hobby = gratis, siempre encendida).
5. Comprueba `/evaluacion`.

## Notas honestas
- El modelo se entrenó con **siluetas** (BodyM). Una foto normal no es una silueta, así
  que el análisis por imagen es orientativo; **las medidas aportan la señal fiable**
  (ver la ablación del notebook). Mejora futura: quitar fondo en el navegador.
- La conversión a tfjs (`02_export_tfjs.ipynb`) es la parte más sensible a versiones.
  Si falla, copia el error y se ajusta.
- El coach usa un corpus curado (RAG sobre `lib/corpus.ts`). El fine-tune QLoRA sobre
  datasets reales sigue siendo un artefacto aparte (`phase-2-llm/02_finetune_qlora.ipynb`).
