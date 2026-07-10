# -*- coding: utf-8 -*-
"""
FORGED · Analizador Corporal · Hugging Face Space (Gradio)
Sirve el modelo de la Fase 1 (body_analyzer.keras). Recibe una imagen corporal +
medidas y devuelve el `perfil` con la banda de IMC estimada (contrato: ../contract.md
en phase-2-llm).

Despliegue GRATIS: Space CPU-only (SDK Gradio). El modelo es pequeno.
Ficheros que debe contener el Space: app.py, requirements.txt, README.md,
body_analyzer.keras y preprocess.json (ambos generados por el notebook de la Fase 1).

Nota honesta (train/serve gap): el modelo se entrena con SILUETAS (mascaras binarias
de BodyM). Una foto real no es una silueta. Por eso hay un interruptor "quitar fondo"
que usa rembg para aproximar una silueta a partir de una foto. Si rembg no esta
disponible, cae a escala de grises (peor). Las MEDIDAS aportan la senal mas fiable.
"""
import os
import json
import numpy as np
from PIL import Image
import gradio as gr
import tensorflow as tf

MODEL_PATH = os.environ.get("MODEL_PATH", "body_analyzer.keras")
PREP_PATH = os.environ.get("PREP_PATH", "preprocess.json")

model = tf.keras.models.load_model(MODEL_PATH)
prep = json.load(open(PREP_PATH, encoding="utf-8"))

IMG_SIZE = prep["img_size"]
CLASS_NAMES = prep["class_names"]
FEAT = prep["tabular_features"]        # orden exacto de las columnas del modelo 1D
NUM_COLS = set(prep["numeric_cols"])   # columnas numericas estandarizadas
MEAN = prep["scaler_mean"]
STD = prep["scaler_std"]
NEEDS_IMG = prep["needs_image"]
NEEDS_TAB = prep["needs_tabular"]


# --------------------------------------------------------------------------
#  Preprocesado (replica el del notebook de la Fase 1)
# --------------------------------------------------------------------------
def build_tabular(medidas, sexo):
    """medidas: dict con claves waist/hip/chest/thigh/height (cm)."""
    vec = []
    for col in FEAT:
        if col in NUM_COLS:
            key = col[2:] if col.startswith("m_") else col   # 'm_waist' -> 'waist'
            raw = medidas.get(key)
            raw = float(raw) if raw not in (None, "") else MEAN[col]  # fallback: media
            std = STD[col] or 1.0
            vec.append((raw - MEAN[col]) / std)
        elif col.startswith("gen_"):
            vec.append(1.0 if col == f"gen_{sexo}" else 0.0)
        else:
            vec.append(0.0)
    return np.array([vec], dtype="float32")


def _to_silhouette(img, quitar_fondo):
    if img is None:
        return None
    if quitar_fondo:
        try:
            from rembg import remove
            out = remove(img.convert("RGBA"))
            alpha = out.split()[-1]                  # mascara del sujeto
            img = Image.merge("RGB", (alpha, alpha, alpha))
        except Exception as e:
            print("rembg no disponible, uso escala de grises:", e)
    g = img.convert("L").resize((IMG_SIZE, IMG_SIZE))
    return np.asarray(g, dtype="float32") / 255.0


def build_image(front, side, quitar_fondo):
    f = _to_silhouette(front, quitar_fondo)
    s = _to_silhouette(side, quitar_fondo)
    if f is None and s is None:
        return np.zeros((1, IMG_SIZE, IMG_SIZE, 2), "float32")
    if f is None:
        f = s
    if s is None:
        s = f                                        # sin lateral -> duplica frontal
    return np.stack([f, s], axis=-1)[None, ...]


# --------------------------------------------------------------------------
#  Inferencia
# --------------------------------------------------------------------------
def analizar(front, side, quitar_fondo, sexo, altura, peso,
             cintura, cadera, pecho, muslo, objetivo, restricciones):
    medidas_modelo = {"waist": cintura, "hip": cadera, "chest": pecho,
                      "thigh": muslo, "height": altura}

    if NEEDS_TAB and NEEDS_IMG:
        probs = model.predict([build_tabular(medidas_modelo, sexo),
                               build_image(front, side, quitar_fondo)], verbose=0)[0]
    elif NEEDS_TAB:
        probs = model.predict(build_tabular(medidas_modelo, sexo), verbose=0)[0]
    else:
        probs = model.predict(build_image(front, side, quitar_fondo), verbose=0)[0]

    idx = int(np.argmax(probs))
    conf = float(np.max(probs))
    imc = round(peso / ((altura / 100.0) ** 2), 1) if altura and peso else None

    perfil = {
        "banda": CLASS_NAMES[idx],
        "clase_idx": idx,
        "imc": imc,
        "confianza": round(conf, 2),
        "sexo": sexo,
        "medidas": {"altura_cm": altura, "peso_kg": peso, "cintura_cm": cintura,
                    "cadera_cm": cadera, "pecho_cm": pecho},
        "objetivo": objetivo,
        "restricciones": restricciones,
    }
    resumen = (f"### Banda estimada: **{CLASS_NAMES[idx]}**  ·  confianza {conf:.0%}"
               + (f"  ·  IMC {imc}" if imc else "")
               + "\n\n> Estimacion de fitness, **no** diagnostico medico.")
    return resumen, perfil


# --------------------------------------------------------------------------
#  UI Gradio (llamable por API desde el frontend de la Fase 3)
# --------------------------------------------------------------------------
with gr.Blocks(title="FORGED · Analizador corporal", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# FORGED · Analizador corporal\n"
                "Sube una imagen + tus medidas y estima tu banda de IMC. "
                "Estimacion de fitness, **no** diagnostico medico.")
    with gr.Row():
        with gr.Column():
            front = gr.Image(type="pil", label="Imagen frontal (silueta o foto)")
            side = gr.Image(type="pil", label="Imagen lateral (opcional)")
            quitar = gr.Checkbox(value=True,
                                 label="Mi imagen es una foto (quitar fondo -> silueta)")
            sexo = gr.Dropdown(["male", "female"], value="male", label="Sexo")
            altura = gr.Number(value=175, label="Altura (cm)")
            peso = gr.Number(value=84, label="Peso (kg)")
            cintura = gr.Number(value=95, label="Cintura (cm)")
            cadera = gr.Number(value=102, label="Cadera (cm)")
            pecho = gr.Number(value=104, label="Pecho (cm)")
            muslo = gr.Number(value=58, label="Muslo (cm)")
            objetivo = gr.Textbox(value="perder grasa", label="Objetivo")
            restricciones = gr.Textbox(value="", label="Restricciones (opcional)")
            btn = gr.Button("Analizar", variant="primary")
        with gr.Column():
            resumen = gr.Markdown()
            perfil_json = gr.JSON(label="perfil (para el Coach · contract.md)")
    btn.click(analizar,
              [front, side, quitar, sexo, altura, peso, cintura, cadera, pecho, muslo,
               objetivo, restricciones],
              [resumen, perfil_json])

if __name__ == "__main__":
    demo.launch()
