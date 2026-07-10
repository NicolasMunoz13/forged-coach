# -*- coding: utf-8 -*-
"""Genera 02_export_tfjs.ipynb: convierte body_analyzer.keras -> TensorFlow.js."""
import json

cells = []
def md(t): cells.append({"cell_type": "markdown", "metadata": {}, "source": t})
def code(t): cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": t})

md(r"""# Fase 1 (export) · Convertir el modelo a TensorFlow.js

Convierte `body_analyzer.keras` a formato **TF.js** para servirlo en el navegador
desde la web (Fase 3, hosting Vercel). Salida: carpeta `model_web/` con
`model.json` + pesos `.bin` + `preprocess.json`.

**Antes de ejecutar:** sube a Colab los dos ficheros que generaste en el notebook
principal: `body_analyzer.keras` y `preprocess.json` (panel de archivos → subir).""")

code(r"""!pip -q install tensorflowjs""")

md(r"""## Conversión

Intenta la API de Python (`save_keras_model`); si falla por versiones de Keras, cae
al conversor por línea de comandos vía formato H5. El objetivo es un **Layers model**
(lo que carga `tf.loadLayersModel` en la web).""")

code(r"""import os, shutil, tensorflow as tf

model = tf.keras.models.load_model("body_analyzer.keras")
os.makedirs("model_web", exist_ok=True)

try:
    import tensorflowjs as tfjs
    tfjs.converters.save_keras_model(model, "model_web")
    print("OK · convertido con save_keras_model")
except Exception as e:
    print("save_keras_model fallo:", e)
    print("Fallback: guardo H5 y uso el conversor por CLI...")
    model.save("body_analyzer.h5")
    rc = os.system("tensorflowjs_converter --input_format keras body_analyzer.h5 model_web")
    print("tensorflowjs_converter rc =", rc)

# preprocess.json viaja junto al modelo (lo lee la web)
shutil.copy("preprocess.json", "model_web/preprocess.json")
print("Contenido de model_web/:", os.listdir("model_web"))""")

md(r"""## Descargar

Empaquetamos `model_web/` en un zip y lo descargamos.""")

code(r"""shutil.make_archive("model_web", "zip", "model_web")
try:
    from google.colab import files
    files.download("model_web.zip")
except Exception:
    print("Descarga manual: model_web.zip en el panel de archivos.")""")

md(r"""## Dónde colocarlo en la web

Descomprime `model_web.zip` y copia **su contenido** dentro de la web:

```
9. Proyecto Final/forged-coach/public/model/
  ├── model.json
  ├── group1-shard1of1.bin   (uno o varios .bin)
  └── preprocess.json
```

La página `/evaluacion` hace `tf.loadLayersModel('/model/model.json')` y lee
`/model/preprocess.json`. Con eso, el análisis corre **en el navegador**, gratis.

> Si `tensorflowjs_converter` diera un error de versiones, copia aquí el mensaje y lo
> resolvemos (a veces hay que fijar una versión concreta de `tensorflow`/`tensorflowjs`).""")

nb = {"cells": cells,
      "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                   "language_info": {"name": "python"}, "colab": {"provenance": []}},
      "nbformat": 4, "nbformat_minor": 4}
with open("02_export_tfjs.ipynb", "w", encoding="utf-8") as f:
    json.dump(nb, f, ensure_ascii=False, indent=1)
print(f"Escrito 02_export_tfjs.ipynb ({len(cells)} celdas)")
