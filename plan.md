# FORGED · Multimodal Fitness Coach — Final Project Plan

**AI Bootcamp ED.5 · Proyecto Final**

> Upload a photo, type three numbers, get a plan built for **your** body.
> A deep-learning body analyzer and a RAG + fine-tuned LLM coach, wired into one
> flow — the Deep Learning and LLM modules doing real work together.

| | |
|---|---|
| **Deadline** | 30 Jul 2026, 12:00 CET |
| **Pass bar** | grade > 6.0 |
| **Format** | group · 15-min demo + Q&A |
| **Cost** | 100% free tier |

---

## 1. The idea, in one line

**A coach that sees you, then talks to you.**

This is a follow-up of the FORGED landing already built for the LLM module
(`7. LLM/llm/`) — but instead of a generic RAG chatbot, the coach now starts from
a real assessment of the user's body composition and grounds every plan in it.

The system does two AI jobs and joins them:

1. A **deep-learning model** estimates body composition from a photo **fused** with
   typed measurements (height, weight, waist).
2. An **LLM coach** — retrieval-augmented and lightly fine-tuned on real
   nutrition/fitness data — turns that estimate into a personalized nutrition and
   training plan.

Neither half is bolted on: **the DL output is the LLM's input.**

---

## 2. Architecture — one flow, both modules

```
Input A: Body photo ─────┐          Input B: height · weight · waist ─────┐
(uploaded client-side)   │          (typed by the user)                  │
                         ▼                                                ▼
                 2D CNN (transfer learning)                     1D tabular MLP
                 MobileNet / ResNet on image                    on measurements
                         └──────────────────┬─────────────────────────┘
                                            ▼
                        ┌─────────────────────────────────────────────┐
                        │  DEEP LEARNING MODULE                        │
                        │  early & late fusion → BMI band + WHO category │
                        │  (same 1D+2D+fusion technique as HAM10000,   │
                        │   on a new dataset)                          │
                        └─────────────────────────────────────────────┘
                                            │
                              ↓ passed as structured context ↓
                        ┌─────────────────────────────────────────────┐
                        │  LLM MODULE                                  │
                        │  RAG + QLoRA-tuned coach →                   │
                        │  personalized nutrition & training plan      │
                        │  (retrieval over a real corpus, grounded in  │
                        │   the user's estimated composition)          │
                        └─────────────────────────────────────────────┘
```

**The demo moment:** one upload + three numbers → a live, body-specific plan. That
single interaction is what shows both modules working, which is precisely what the
rubric's "demo + technical architecture" slide rewards.

---

## 3. Honest reality-checks

### Reframe 1 · "Train an LLM" → don't train, retrieve & adapt

Training an LLM from scratch is infeasible (cost + data). What the course actually
taught is **RAG** (M19) and **QLoRA fine-tuning** (M14, the "Milei" notebook).

**Plan:** RAG for factual accuracy + a QLoRA fine-tune on a real nutrition dataset
as the genuine "trained on real data" showcase. Both run on free Colab GPU.

### Reframe 2 · "Overweight from a photo" → estimate, don't diagnose

Single-photo body judgment is noisy and can be harmful if worded as a verdict.
Real public datasets exist (BodyM, 2DImage2BMI), and they pair images *with*
measurements — i.e. they're fusion problems.

**Plan:** output an estimated BMI band + category with a visible "estimate, not
medical advice" disclaimer; accuracy comes from fusing the photo with the typed
numbers.

**Verdict — the idea is strong.** It reuses a technique already proven (fusion) and
an app already owned (FORGED), and joins the two favorite modules into one coherent
product.

---

## 4. Build plan — six phases

### Phase 0 · Setup — scope & ethics
- Fork the FORGED app into the capstone repo; keep the landing, replace the coach flow.
- Lock the framing: disclaimers, "estimate not diagnosis", photos processed
  client-side and not persisted.
- Agree team roles (DL model / LLM / frontend / deploy).

### Phase 1 · DL model — body analyzer (the reused fusion technique)
- Dataset: **BodyM** (primary) or **2DImage2BMI**. Compute BMI from height/weight;
  bin into WHO bands as labels.
- Build all four models like the HAM10000 practica: 1D tabular MLP, 2D CNN
  (transfer learning), **late fusion**, **early fusion**.
- Error analysis + hyperparameter notes (the practica rubric rewards this over raw
  accuracy).
- Export best model to a Hugging Face Space (Gradio).
- *maps to → Deep Learning · M4–M6 (CNN + fusion)*

### Phase 2 · LLM coach — RAG + a real-data fine-tune
- RAG corpus from real sources: USDA FoodData Central, gym/exercise + fitness-QA datasets.
- QLoRA fine-tune an open model (Gemma / Qwen) on a real dietary-recommendation
  dataset — the "trained on real data" headline.
- Prompt contract: the coach receives the DL model's BMI band + category as
  structured context.
- Add a RAG evaluation pass (RAGAs, M20) so answer quality is defensible in Q&A.
- *maps to → LLM · M14 (QLoRA) · M19 (RAG) · M20 (eval)*

### Phase 3 · Frontend — build the app UI
- Reuse the FORGED design system (CSS vars, Oswald/Inter, Goggins voice) — no
  restyle from zero.
- **Assessment page:** drag-and-drop photo upload + measurement form
  (height / weight / waist), with client-side validation and a clear "estimate, not
  medical advice" notice.
- **Results view:** BMI band + WHO category shown as a labeled gauge/badge, with the
  fusion confidence framed honestly.
- **Coach view:** chat UI that streams the plan; render the nutrition + training plan
  as structured cards, not a wall of text.
- Loading / empty / error states for the Space calls (cold-starts happen on free tier).
- Responsive + accessible (AA contrast, keyboard focus) — carry over the M9
  acceptance criteria.
- *maps to → reuse of the FORGED Next.js app · new Assessment + Coach flows*

### Phase 4 · Integrate — wire it together & ship
- Connect the flow: form → DL Space → result → coach → rendered plan.
- Define the API contract between frontend and each Space (request/response shapes).
- Deploy web on Vercel; models on HF Spaces — the existing, free stack.
- End-to-end smoke test the full upload-to-plan path before demo day.
- *maps to → reuse of the FORGED capstone stack*

### Phase 5 · Present — 15-minute demo
- Architecture diagram → live upload-to-plan flow → reflection slide.
- Prep answers on: fusion choice, why RAG + fine-tune, dataset limits, ethics.
- Rehearse to time; the pitch is graded as much as the code.
- *maps to → proyecto_final.pdf presentation rubric*

---

## 5. Data sources — real, public, free datasets

| Dataset | Use | Size | Access |
|---|---|---|---|
| **BodyM** | DL — image + measurements → BMI (primary) | 8,978 photos · 2,505 people | public |
| **2DImage2BMI** | DL — backup image→BMI set | 4,189 images | public / GitHub |
| **USDA FoodData Central** | RAG — nutrition facts corpus | large | public API |
| **onurSakar/GYM-Exercise** | RAG — exercise instructions | — | HF datasets |
| **hammamwahab/fitness-qa** | RAG / eval — fitness Q&A | — | HF datasets |
| **issai/…Dietary_Recommendation** | Fine-tune — diet-plan instructions | 50 profiles | HF datasets |

> Verify each dataset's license before use; BodyM and the HF sets are
> research/non-commercial — fine for a bootcamp capstone, and worth stating on the
> ethics slide.

---

## 6. Stack — everything on free tiers

| Layer | Tool | Free how |
|---|---|---|
| Model training | Google Colab (T4 GPU) | free tier — enough for QLoRA + CNN |
| Model hosting | Hugging Face Spaces (Gradio) | free tier |
| LLM generation | Google AI Studio / Groq free API, or the fine-tuned open model in-Space | free API quota |
| Web app | Next.js 15 (existing FORGED app) | open source |
| Web hosting | Vercel | hobby tier |
| Vector store (RAG) | FAISS / Chroma (in-Space) | open source, no server |

> Keep API keys as HF/Vercel secrets — never in the repo, matching the rule already
> in the FORGED `CLAUDE.md`.

---

## 7. Risks & how we answer them

- **"Is a photo really predictive?"** — Show the fusion ablation: image-only vs
  tabular-only vs fused. The typed numbers carry most of the signal; the photo adds
  context. Honesty here scores points.
- **"Isn't this medical advice?"** — Explicit disclaimer, WHO-band framing, no
  diagnosis language, non-commercial data. It's a fitness estimate, stated as such.
- **"Where's the real data?"** — Public datasets above + a real QLoRA fine-tune,
  with a RAGAs eval to back answer quality.
- **"Free forever?"** — Every layer is a documented free tier; note the trade-offs
  (Space cold-starts, API quotas) as known limits.

---

*Stay hard. — FORGED · Multimodal Fitness Coach, plan for KeepCoding AI Bootcamp
ED.5 final project. Estimates only, not medical advice.*
