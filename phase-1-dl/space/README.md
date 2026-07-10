---
title: FORGED Analizador Corporal
emoji: 📏
colorFrom: gray
colorTo: green
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: cc-by-nc-4.0
---

# FORGED · Analizador corporal (Deep Learning)

Sirve el modelo de la **Fase 1**. Recibe una imagen corporal + medidas y devuelve el
`perfil` con la **banda de IMC** estimada (contrato en `phase-2-llm/contract.md`).

> Estimación de fitness, **no** diagnóstico médico.

## Ficheros que debe tener el Space
- `app.py`, `requirements.txt`, `README.md`
- **`body_analyzer.keras`** y **`preprocess.json`** → los genera el notebook
  `01_body_analyzer_bodym.ipynb` (descárgalos de Colab y súbelos aquí).

## Cómo desplegar (gratis)
1. Crea un Space (SDK **Gradio**).
2. Sube los 5 ficheros de arriba.
3. Arranca solo (no necesita secretos ni API keys).
4. Copia la URL → el frontend (Fase 3) la usará para llamar al analizador.

## Nota honesta · train/serve gap
El modelo se entrena con **siluetas** (máscaras binarias de BodyM). Una foto real no
es una silueta, así que el interruptor **"quitar fondo"** usa `rembg` para aproximar
una silueta a partir de la foto. Si `rembg` falla o lo quitas de `requirements.txt`,
cae a escala de grises (peor). Las **medidas** aportan la señal más fiable en producción
— justo lo que muestra la ablación multimodal del notebook.
