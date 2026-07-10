# -*- coding: utf-8 -*-
"""
Genera el notebook Fase 1 (analizador corporal multimodal sobre BodyM).
Ejecutar:  python build_notebook.py  -> escribe 01_body_analyzer_bodym.ipynb
El notebook es el entregable; este script solo garantiza un JSON valido.
"""
import json

cells = []

def md(text):
    cells.append({"cell_type": "markdown", "metadata": {}, "source": text})

def code(text):
    cells.append({"cell_type": "code", "metadata": {}, "execution_count": None,
                  "outputs": [], "source": text})

# ---------------------------------------------------------------- 0. Portada
md(r"""# Fase 1 · Analizador Corporal Multimodal (BodyM)

## Estimacion de la banda de IMC a partir de silueta + medidas corporales

**Proyecto Final — Bootcamp IA ED.5 · FORGED · Multimodal Fitness Coach**

Este notebook es el componente de **Deep Learning** del proyecto final. Reutiliza
exactamente la tecnica de la practica de HAM10000 (modelo 1D tabular + modelo 2D
CNN + late-fusion + early-fusion), aplicada a un problema nuevo y a un dataset
publico y real: **BodyM**.

El modelo estima la **banda de IMC** (Indice de Masa Corporal) de una persona a
partir de:
1. Una **silueta corporal** (imagen) — modelo 2D.
2. Un conjunto de **medidas corporales** auto-reportables — modelo 1D.

Luego combina ambas fuentes con las dos estrategias de fusion vistas en clase.

| Hito | Descripcion |
|------|-------------|
| **Hito 1** | Modelo 1D → banda de IMC solo con medidas tabulares |
| **Hito 2** | Modelo 2D → banda de IMC con la silueta (CNN) |
| **Hito 3** | Late-Fusion → combinacion de las **predicciones** de ambos modelos |
| **Hito 4** | Early-Fusion → combinacion de las **caracteristicas** de ambos modelos |

> **Decision anti-fuga de informacion (importante):** el IMC se calcula como
> `peso / altura^2`. Por eso el modelo 1D **NO recibe el peso** como feature: si lo
> recibiera, reconstruiria la etiqueta de forma trivial y el ejercicio de ML no
> tendria sentido. El modelo aprende a **estimar** el IMC a partir de la forma del
> cuerpo y de contornos (cintura, cadera, pecho, muslo) + altura.

> **Aviso etico:** esto es una **estimacion** con fines de fitness, **no un
> diagnostico medico**. Se comunica siempre como tal en la app.
""")

# ---------------------------------------------------------------- Dataset
md(r"""## Dataset: BodyM

**BodyM** (Amazon) es el primer dataset publico grande de medidas corporales:
**8.978 siluetas** frontales y laterales de **2.505 personas reales**, con altura,
peso, genero y 14 medidas corporales (cintura, cadera, pecho, muslo, etc.).

- Alojado en S3: `s3://amazon-bodym` (region `us-west-2`), acceso publico
  (`--no-sign-request`, no necesita cuenta de AWS).
- Splits oficiales: **train**, **testA** (mismo entorno de captura) y **testB**
  (fotos "in-the-wild", mas dificil — util para analisis de robustez).
- Licencia: **CC BY-NC 4.0** (uso no comercial / academico → adecuado para el
  bootcamp; se cita en la presentacion).

### Bandas de IMC (criterio OMS)

| Banda | Rango de IMC | Clase |
|-------|--------------|:-----:|
| Bajo peso  | < 18.5      | 0 |
| Normal     | 18.5 – 24.9 | 1 |
| Sobrepeso  | 25.0 – 29.9 | 2 |
| Obesidad   | ≥ 30.0      | 3 |

> Referencia: Ruiz et al., *"BodyM"* / Adversarial Body Sim.
> https://adversarialbodysim.github.io/ · Registry of Open Data on AWS.
""")

# ---------------------------------------------------------------- 1. Setup
md(r"""---
## 1. Configuracion e imports

> En Colab: **Entorno de ejecucion → Cambiar tipo de entorno → GPU** antes de empezar.

Todos los parametros ajustables estan en la celda de **configuracion**. Si la
inspeccion del dataset (seccion 3) muestra nombres de columna distintos, se cambian
aqui en un solo sitio.""")

code(r"""# --- Imports ---
import os, json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.utils.class_weight import compute_class_weight

import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import (Dense, Flatten, Conv2D, MaxPooling2D,
                                      Dropout, Input, Concatenate)
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping

# Reproducibilidad
np.random.seed(42)
tf.random.set_seed(42)

print("TensorFlow:", tf.__version__)
print("GPU disponible:", tf.config.list_physical_devices('GPU'))""")

code(r"""# ==========================================================
#  CONFIGURACION  (ajusta aqui si la estructura real difiere)
# ==========================================================
S3_BUCKET   = "s3://amazon-bodym"
DATA_DIR    = "bodym"        # carpeta local tras la descarga
SPLIT_TRAIN = "train"        # split oficial para entrenamiento + validacion
SPLIT_TEST  = "testA"        # split oficial para test (testB = in-the-wild)

IMG_SIZE    = 96             # las siluetas se redimensionan a IMG_SIZE x IMG_SIZE
                            # (sube a 128 si tienes RAM/GPU de sobra)

# Medidas de measurements.csv que usa el modelo 1D.
# NO se incluye 'weight' (fuga de informacion: IMC = peso/altura^2).
TABULAR_MEASURES = ["waist", "hip", "chest", "thigh", "height"]

# Nombres de las carpetas de siluetas dentro de cada split
FRONT_DIR = "mask"          # silueta frontal
SIDE_DIR  = "mask_left"     # silueta lateral

# Bandas de IMC (OMS)
CLASS_NAMES = ["Bajo peso", "Normal", "Sobrepeso", "Obesidad"]
NUM_CLASSES = len(CLASS_NAMES)

def imc_a_banda(b):
    if b < 18.5: return 0
    if b < 25.0: return 1
    if b < 30.0: return 2
    return 3""")

# ---------------------------------------------------------------- 2. Download
md(r"""---
## 2. Descarga del dataset

Descargamos los splits `train` y `testA` desde el bucket publico de S3. Las
siluetas son PNG pequenos en blanco y negro, asi que la descarga es ligera.""")

code(r"""# awscli permite descargar de un bucket publico con --no-sign-request
!pip -q install awscli

# Vemos primero la estructura de primer nivel del bucket
print("=== Contenido del bucket ===")
!aws s3 ls {S3_BUCKET}/ --no-sign-request""")

code(r"""# Sincronizamos solo los splits que necesitamos
for split in [SPLIT_TRAIN, SPLIT_TEST]:
    print(f"Descargando split: {split} ...")
    !aws s3 sync {S3_BUCKET}/{split} {DATA_DIR}/{split} --no-sign-request --quiet

print("\nDescarga completada. Estructura local:")
for split in [SPLIT_TRAIN, SPLIT_TEST]:
    base = Path(DATA_DIR) / split
    if base.exists():
        print(f"\n[{split}]")
        for p in sorted(base.iterdir()):
            n = len(list(p.glob('*'))) if p.is_dir() else '-'
            print(f"  {p.name:28s} ({'dir, ' + str(n) + ' ficheros' if p.is_dir() else 'fichero'})")""")

# ---------------------------------------------------------------- 3. Explore
md(r"""---
## 3. Carga y exploracion

Cargamos los tres CSV de cada split y **mostramos sus columnas reales**. Este es el
punto de verificacion: si algun nombre difiere de lo esperado, se ajusta la
configuracion y las funciones `pick(...)` lo resuelven automaticamente.""")

code(r"""def norm_cols(df):
    # Normaliza nombres de columna: minusculas, sin espacios ni guiones.
    df.columns = [c.strip().lower().replace('-', '_').replace(' ', '_')
                  for c in df.columns]
    return df

def pick(cols, *cands):
    # Devuelve el primer nombre candidato presente en 'cols'.
    for c in cands:
        if c in cols:
            return c
    raise KeyError(f"Ninguna de {cands} esta en {list(cols)}")

def load_csvs(split):
    base = Path(DATA_DIR) / split
    hwg  = norm_cols(pd.read_csv(base / "hwg_metadata.csv"))
    meas = norm_cols(pd.read_csv(base / "measurements.csv"))
    smap = norm_cols(pd.read_csv(base / "subject_to_photo_map.csv"))
    return base, hwg, meas, smap

base_tr, hwg_tr, meas_tr, smap_tr = load_csvs(SPLIT_TRAIN)

print("hwg_metadata.csv        ->", hwg_tr.columns.tolist())
print("measurements.csv        ->", meas_tr.columns.tolist())
print("subject_to_photo_map.csv->", smap_tr.columns.tolist())
print("\nEjemplo hwg_metadata:")
hwg_tr.head()""")

code(r"""# Construimos un unico DataFrame por split: una fila por foto, con medidas + IMC.
# Esquema real de BodyM (verificado en el bucket S3):
#   hwg_metadata.csv         -> subject_id, gender, height_cm, weight_kg
#   measurements.csv         -> subject_id, ankle, arm-length, ..., waist, wrist
#   subject_to_photo_map.csv -> subject_id, photo_id
def build_frame(split):
    base, hwg, meas, smap = load_csvs(split)

    # measurements trae su propia 'height'; la prefijamos para no chocar con hwg
    meas = meas.rename(columns={c: f"m_{c}" for c in meas.columns
                                if c != 'subject_id'})

    # Todas las tablas comparten 'subject_id' -> merge directo (una fila por foto)
    df = smap.merge(hwg, on='subject_id').merge(meas, on='subject_id')

    # IMC = peso(kg) / altura(m)^2 ; height_cm viene en centimetros
    h = df['height_cm'].astype(float)
    h_m = h / 100.0 if h.median() > 3 else h        # cm -> m
    df['bmi'] = df['weight_kg'].astype(float) / (h_m ** 2)

    # Limpieza: descartamos IMC fuera de un rango fisiologico razonable
    df = df[(df['bmi'] >= 12) & (df['bmi'] <= 60)].reset_index(drop=True)

    df['banda']  = df['bmi'].apply(imc_a_banda)
    df['_photo'] = df['photo_id'].astype(str)
    return df, base

df_tr, base_tr = build_frame(SPLIT_TRAIN)
df_te, base_te = build_frame(SPLIT_TEST)

print(f"Fotos en train: {len(df_tr)}   |   Fotos en test: {len(df_te)}")
print("\nEstadisticas de IMC (train):")
print(df_tr['bmi'].describe().round(2))""")

code(r"""# Distribucion de bandas de IMC
plt.figure(figsize=(9, 4))
counts = df_tr['banda'].value_counts().sort_index()
plt.bar([CLASS_NAMES[i] for i in counts.index], counts.values,
        color='steelblue', edgecolor='black')
plt.title('Distribucion de bandas de IMC (train)')
plt.ylabel('Numero de fotos')
for i, v in zip(range(len(counts)), counts.values):
    plt.text(i, v + max(counts.values)*0.01, str(v), ha='center', fontsize=9)
plt.tight_layout(); plt.show()

print("El dataset suele estar desbalanceado hacia 'Normal'/'Sobrepeso'.")
print("Lo tendremos en cuenta con class_weight al entrenar.")""")

code(r"""# Localizamos las carpetas de siluetas y mostramos un ejemplo
def find_image(base, photo_id, subdir):
    # Busca el PNG de una foto; tolera que el id ya traiga extension.
    d = base / subdir
    for cand in (d / f"{photo_id}.png", d / f"{photo_id}"):
        if cand.exists():
            return cand
    hits = list(d.glob(f"{photo_id}*"))
    return hits[0] if hits else None

# Comprobamos que existen las carpetas esperadas
print("Subcarpetas en train:", [p.name for p in base_tr.iterdir() if p.is_dir()])

fig, axes = plt.subplots(1, 4, figsize=(12, 4))
for ax, banda in zip(axes, range(NUM_CLASSES)):
    fila = df_tr[df_tr['banda'] == banda]
    if len(fila) == 0:
        ax.axis('off'); continue
    fila = fila.iloc[0]
    p = find_image(base_tr, fila['_photo'], FRONT_DIR)
    if p:
        ax.imshow(Image.open(p).convert('L'), cmap='gray')
    ax.set_title(f"{CLASS_NAMES[banda]}\nIMC={fila['bmi']:.1f}", fontsize=10)
    ax.axis('off')
plt.suptitle('Silueta frontal de ejemplo por banda de IMC')
plt.tight_layout(); plt.show()""")

# ---------------------------------------------------------------- 4. Preprocess
md(r"""---
## 4. Preprocesamiento

### Datos tabulares (Modelo 1D)
- `gender` → one-hot.
- Medidas de `TABULAR_MEASURES` (cintura, cadera, pecho, muslo, altura) →
  estandarizadas (media 0, desviacion 1) usando **solo** estadisticas de train.
- **Sin peso** (anti-fuga).

### Imagenes (Modelo 2D)
- Silueta **frontal** + **lateral** → escala de grises, `IMG_SIZE x IMG_SIZE`,
  normalizadas a [0, 1], apiladas como imagen de **2 canales** `(IMG_SIZE, IMG_SIZE, 2)`.
- Usar las dos vistas da mas informacion de forma que una sola.

### Etiquetas
- Banda de IMC (0–3) → one-hot.

### Split
- `train` oficial → 85% train / 15% validacion (estratificado).
- `testA` oficial → test.""")

code(r"""# ---- Tabular ----
def features_tabulares(df, medidas):
    cols = []
    # medidas numericas (con prefijo m_ salvo la altura de hwg)
    for m in medidas:
        for cand in (f"m_{m}", m):
            if cand in df.columns:
                cols.append(cand); break
    X = df[cols].astype(np.float32).copy()
    # genero one-hot
    g_col = pick(df.columns, 'gender', 'sex')
    g = pd.get_dummies(df[g_col].astype(str), prefix='gen')
    X = pd.concat([X.reset_index(drop=True), g.reset_index(drop=True)], axis=1)
    return X, cols, list(g.columns)

X_tr_df, num_cols, gen_cols = features_tabulares(df_tr, TABULAR_MEASURES)
X_te_df, _, gen_cols_te = features_tabulares(df_te, TABULAR_MEASURES)

# Alineamos columnas de genero por si un split tiene categorias distintas
X_tr_df, X_te_df = X_tr_df.align(X_te_df, join='outer', axis=1, fill_value=0)
feat_cols = X_tr_df.columns.tolist()

# Estandarizacion de las columnas numericas con estadisticas de TRAIN
mean = X_tr_df[num_cols].mean()
std  = X_tr_df[num_cols].std().replace(0, 1)
X_tr_df[num_cols] = (X_tr_df[num_cols] - mean) / std
X_te_df[num_cols] = (X_te_df[num_cols] - mean) / std

X_tab_all  = X_tr_df.values.astype(np.float32)
X_tab_test = X_te_df.values.astype(np.float32)
print("Features tabulares:", feat_cols)
print("Shape tabular train/test:", X_tab_all.shape, X_tab_test.shape)""")

code(r"""# ---- Imagenes ----
def load_sil(base, photo_id, size):
    def one(subdir):
        p = find_image(base, photo_id, subdir)
        if p is None:
            return np.zeros((size, size), np.float32)
        return np.asarray(Image.open(p).convert('L').resize((size, size)),
                          dtype=np.float32) / 255.0
    front = one(FRONT_DIR)
    side  = one(SIDE_DIR)
    if side.sum() == 0:      # si no hay lateral, duplicamos la frontal
        side = front
    return np.stack([front, side], axis=-1)   # (size, size, 2)

def build_images(df, base, size):
    arr = np.zeros((len(df), size, size, 2), np.float32)
    for i, pid in enumerate(df['_photo'].values):
        arr[i] = load_sil(base, pid, size)
        if (i + 1) % 1000 == 0:
            print(f"  {i+1}/{len(df)} imagenes cargadas")
    return arr

print("Cargando siluetas de train...")
X_img_all  = build_images(df_tr, base_tr, IMG_SIZE)
print("Cargando siluetas de test...")
X_img_test = build_images(df_te, base_te, IMG_SIZE)
print("Shape imagenes train/test:", X_img_all.shape, X_img_test.shape)""")

code(r"""# ---- Etiquetas + split train/val (POR SUJETO, no por foto) ----
y_all  = to_categorical(df_tr['banda'].values, NUM_CLASSES)
y_test = to_categorical(df_te['banda'].values, NUM_CLASSES)

# Un sujeto tiene varias fotos: separamos por subject_id para que ninguna persona
# aparezca a la vez en train y validacion (evita optimismo en la validacion).
subj_band = df_tr.groupby('subject_id')['banda'].first()
subj_tr, subj_val = train_test_split(
    subj_band.index.values, test_size=0.15, random_state=42,
    stratify=subj_band.values)

idx_tr  = np.where(df_tr['subject_id'].isin(subj_tr).values)[0]
idx_val = np.where(df_tr['subject_id'].isin(subj_val).values)[0]

X_tab_train, X_tab_val = X_tab_all[idx_tr], X_tab_all[idx_val]
X_img_train, X_img_val = X_img_all[idx_tr], X_img_all[idx_val]
y_train,     y_val     = y_all[idx_tr],     y_all[idx_val]

print(f"Train: {len(idx_tr)}  |  Val: {len(idx_val)}  |  Test: {len(df_te)}")
print(f"Sujetos -> train: {len(subj_tr)}  val: {len(subj_val)}")

# Pesos de clase para el desbalanceo (se usan al entrenar 1D y 2D)
y_int = df_tr['banda'].values[idx_tr]
cw = compute_class_weight('balanced', classes=np.arange(NUM_CLASSES), y=y_int)
class_weight = {i: w for i, w in enumerate(cw)}
print("class_weight:", {CLASS_NAMES[i]: round(w, 2) for i, w in class_weight.items()})""")

# ---------------------------------------------------------------- helpers
md("""### Funciones auxiliares de visualizacion""")

code(r"""def plot_training(history, title):
    fig, ax = plt.subplots(1, 2, figsize=(13, 4))
    ax[0].plot(history.history['loss'], label='Train')
    ax[0].plot(history.history['val_loss'], label='Val')
    ax[0].set_title(f'{title} - Loss'); ax[0].set_xlabel('Epoca'); ax[0].legend(); ax[0].grid(True)
    ax[1].plot(history.history['accuracy'], label='Train')
    ax[1].plot(history.history['val_accuracy'], label='Val')
    ax[1].set_title(f'{title} - Accuracy'); ax[1].set_xlabel('Epoca'); ax[1].legend(); ax[1].grid(True)
    plt.tight_layout(); plt.show()

def plot_confusion(y_true, y_pred, title):
    cm = confusion_matrix(np.argmax(y_true, 1), np.argmax(y_pred, 1))
    plt.figure(figsize=(6.5, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES)
    plt.title(title); plt.ylabel('Real'); plt.xlabel('Predicho')
    plt.tight_layout(); plt.show()

def reporte(y_true, y_pred, nombre):
    acc = accuracy_score(np.argmax(y_true, 1), np.argmax(y_pred, 1))
    print(f"\n=== {nombre} — Accuracy test: {acc:.4f} ({acc*100:.2f}%) ===")
    print(classification_report(np.argmax(y_true, 1), np.argmax(y_pred, 1),
                                target_names=CLASS_NAMES))
    return acc""")

# ---------------------------------------------------------------- Hito 1
md(r"""---
## Hito 1: Modelo 1D — banda de IMC con medidas tabulares

Red densa (MLP) sobre genero + medidas (sin peso). Es el baseline: mide cuanta
senal hay solo en las medidas auto-reportables.

```
Entrada (N features) → Dense(64, ReLU) → Dense(32, ReLU) → Dense(4, Softmax)
```""")

code(r"""n_features = X_tab_train.shape[1]

model_1d = Sequential([
    Dense(64, activation='relu', input_shape=(n_features,), name='dense_1'),
    Dropout(0.3),
    Dense(32, activation='relu', name='dense_2'),
    Dense(NUM_CLASSES, activation='softmax', name='output_1d')
], name='modelo_1d')

model_1d.compile(optimizer=Adam(1e-3), loss='categorical_crossentropy',
                 metrics=['accuracy'])
model_1d.summary()""")

code(r"""es = EarlyStopping(monitor='val_loss', patience=12, restore_best_weights=True, verbose=1)
history_1d = model_1d.fit(
    X_tab_train, y_train, validation_data=(X_tab_val, y_val),
    epochs=80, batch_size=64, class_weight=class_weight, callbacks=[es], verbose=1)

plot_training(history_1d, 'Modelo 1D (Tabular)')
y_pred_1d = model_1d.predict(X_tab_test)
acc_1d = reporte(y_test, y_pred_1d, 'Modelo 1D')
plot_confusion(y_test, y_pred_1d, 'Modelo 1D - Matriz de confusion')""")

# ---------------------------------------------------------------- Hito 2
md(r"""---
## Hito 2: Modelo 2D — banda de IMC con la silueta (CNN)

CNN sobre la imagen de 2 canales (frontal + lateral). Como las siluetas son
binarias y muy distintas a ImageNet, entrenamos una **CNN desde cero** (mas
apropiada aqui que un backbone preentrenado; el transfer learning queda como
mejora opcional).

```
(H,W,2) → [Conv32→Pool] → [Conv64→Pool] → [Conv128→Pool] → Flatten → Dense(128) → Dense(4)
```""")

code(r"""model_2d = Sequential([
    Conv2D(32, 3, activation='relu', padding='same',
           input_shape=(IMG_SIZE, IMG_SIZE, 2), name='conv1'),
    MaxPooling2D(2, name='pool1'),
    Conv2D(64, 3, activation='relu', padding='same', name='conv2'),
    MaxPooling2D(2, name='pool2'),
    Conv2D(128, 3, activation='relu', padding='same', name='conv3'),
    MaxPooling2D(2, name='pool3'),
    Flatten(name='flatten'),
    Dense(128, activation='relu', name='dense'),
    Dropout(0.5, name='drop'),
    Dense(NUM_CLASSES, activation='softmax', name='output_2d')
], name='modelo_2d')

model_2d.compile(optimizer=Adam(1e-3), loss='categorical_crossentropy',
                 metrics=['accuracy'])
model_2d.summary()""")

code(r"""es2 = EarlyStopping(monitor='val_loss', patience=8, restore_best_weights=True, verbose=1)
history_2d = model_2d.fit(
    X_img_train, y_train, validation_data=(X_img_val, y_val),
    epochs=40, batch_size=64, class_weight=class_weight, callbacks=[es2], verbose=1)

plot_training(history_2d, 'Modelo 2D (CNN)')
y_pred_2d = model_2d.predict(X_img_test)
acc_2d = reporte(y_test, y_pred_2d, 'Modelo 2D')
plot_confusion(y_test, y_pred_2d, 'Modelo 2D - Matriz de confusion')""")

# ---------------------------------------------------------------- Hito 3
md(r"""---
## Hito 3: Late-Fusion — combinacion de predicciones

Concatenamos las **probabilidades** de los dos modelos ya entrenados y un pequeno
clasificador aprende a combinarlas.

```
tabular → model_1d → 4 probs ↘
                               Concatenate(8) → Dense(4, Softmax)
imagen  → model_2d → 4 probs ↗
```""")

code(r"""def build_late_fusion():
    t_in = Input(shape=(n_features,), name='tab_in')
    v_in = Input(shape=(IMG_SIZE, IMG_SIZE, 2), name='img_in')
    merged = Concatenate()([model_1d(t_in), model_2d(v_in)])
    out = Dense(NUM_CLASSES, activation='softmax', name='output_late')(merged)
    return Model([t_in, v_in], out, name='modelo_late_fusion')

model_late = build_late_fusion()
model_late.compile(optimizer=Adam(1e-3), loss='categorical_crossentropy',
                   metrics=['accuracy'])

history_late = model_late.fit(
    [X_tab_train, X_img_train], y_train,
    validation_data=([X_tab_val, X_img_val], y_val),
    epochs=40, batch_size=64, verbose=1)

plot_training(history_late, 'Late-Fusion')
y_pred_late = model_late.predict([X_tab_test, X_img_test])
acc_late = reporte(y_test, y_pred_late, 'Late-Fusion')""")

# ---------------------------------------------------------------- Hito 4
md(r"""---
## Hito 4: Early-Fusion — combinacion de caracteristicas

En lugar de las predicciones finales, combinamos las **representaciones internas**
(features) de cada modelo antes de su capa de salida, y aprendemos un clasificador
mas profundo sobre ellas.

```
tabular → features 1D (32) ↘
                            Concatenate(160) → Dense(128) → Dense(64) → Dense(4)
imagen  → features 2D (128) ↗
```""")

code(r"""def build_early_fusion():
    t_in = Input(shape=(n_features,), name='tab_in')
    v_in = Input(shape=(IMG_SIZE, IMG_SIZE, 2), name='img_in')

    # features del modelo 1D (hasta 'dense_2' -> 32)
    t = model_1d.get_layer('dense_1')(t_in)
    t = model_1d.get_layer('dense_2')(t)

    # features del modelo 2D (hasta 'dense' -> 128)
    x = v_in
    for name in ['conv1','pool1','conv2','pool2','conv3','pool3','flatten','dense']:
        x = model_2d.get_layer(name)(x)

    merged = Concatenate()([t, x])
    h = Dense(128, activation='relu', name='ef_1')(merged)
    h = Dense(64,  activation='relu', name='ef_2')(h)
    out = Dense(NUM_CLASSES, activation='softmax', name='output_early')(h)
    return Model([t_in, v_in], out, name='modelo_early_fusion')

model_early = build_early_fusion()
model_early.compile(optimizer=Adam(1e-3), loss='categorical_crossentropy',
                    metrics=['accuracy'])

history_early = model_early.fit(
    [X_tab_train, X_img_train], y_train,
    validation_data=([X_tab_val, X_img_val], y_val),
    epochs=60, batch_size=64, callbacks=[
        EarlyStopping(monitor='val_loss', patience=12, restore_best_weights=True)],
    verbose=1)

plot_training(history_early, 'Early-Fusion')
y_pred_early = model_early.predict([X_tab_test, X_img_test])
acc_early = reporte(y_test, y_pred_early, 'Early-Fusion')""")

# ---------------------------------------------------------------- Comparativa
md(r"""---
## 5. Comparativa y analisis de errores

La tabla siguiente **es** la ablacion multimodal que defenderemos en la
presentacion: `1D = solo medidas`, `2D = solo imagen`, y las dos fusiones. Muestra
cuanto aporta cada fuente y si combinarlas mejora.""")

code(r"""res = pd.DataFrame({
    'Modelo': ['1D (medidas)', '2D (silueta)', 'Late-Fusion', 'Early-Fusion'],
    'Accuracy': [acc_1d, acc_2d, acc_late, acc_early]})
res['Accuracy (%)'] = (res['Accuracy'] * 100).round(2)
print("=== COMPARATIVA ==="); print(res.to_string(index=False))

plt.figure(figsize=(9, 4.5))
colores = ['#4C72B0', '#DD8452', '#55A868', '#C44E52']
b = plt.bar(res['Modelo'], res['Accuracy'], color=colores, edgecolor='black')
plt.title('Comparativa de accuracy — ablacion multimodal')
plt.ylabel('Accuracy en test'); plt.ylim(0, 1)
for bar, a in zip(b, res['Accuracy']):
    plt.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.01,
             f'{a:.3f}', ha='center', fontweight='bold')
plt.tight_layout(); plt.show()""")

code(r"""# Mejor modelo -> accuracy por clase + errores
accs  = [acc_1d, acc_2d, acc_late, acc_early]
preds = [y_pred_1d, y_pred_2d, y_pred_late, y_pred_early]
names = ['1D (medidas)', '2D (silueta)', 'Late-Fusion', 'Early-Fusion']
best  = int(np.argmax(accs))
print(f"Mejor modelo: {names[best]} (acc={accs[best]:.4f})")

yt = np.argmax(y_test, 1)
yp = np.argmax(preds[best], 1)
print("\nAccuracy por banda:")
for i, c in enumerate(CLASS_NAMES):
    m = yt == i
    if m.sum():
        print(f"  {c:>10}: {accuracy_score(yt[m], yp[m]):.3f}  ({m.sum()} en test)")
plot_confusion(y_test, preds[best], f'{names[best]} - Matriz de confusion')""")

# ---------------------------------------------------------------- Export
md(r"""---
## 6. Exportacion del mejor modelo (handoff a Fase 2/3)

Guardamos el mejor modelo + los parametros de preprocesado. Esto es lo que se sube
al **Hugging Face Space** (Fase 3) para servir el analizador desde la app.""")

code(r"""modelos = [model_1d, model_2d, model_late, model_early]
best_model = modelos[best]

best_model.save('body_analyzer.keras')

preprocess = {
    'model_type':      names[best],
    'img_size':        IMG_SIZE,
    'front_dir':       FRONT_DIR,
    'side_dir':        SIDE_DIR,
    'tabular_features': feat_cols,
    'numeric_cols':    num_cols,
    'scaler_mean':     {c: float(mean[c]) for c in num_cols},
    'scaler_std':      {c: float(std[c])  for c in num_cols},
    'class_names':     CLASS_NAMES,
    'needs_image':     best in (1, 2, 3),   # el 1D no necesita imagen
    'needs_tabular':   best in (0, 2, 3),
}
with open('preprocess.json', 'w') as f:
    json.dump(preprocess, f, indent=2, ensure_ascii=False)

print("Guardado: body_analyzer.keras + preprocess.json")
print(json.dumps(preprocess, indent=2, ensure_ascii=False)[:600])""")

# ---------------------------------------------------------------- Extra testB
md(r"""---
## 7. (Opcional) Robustez: evaluacion en testB (in-the-wild)

`testB` fue fotografiado en condiciones menos controladas. Evaluar aqui muestra
cuanto cae el modelo fuera del entorno de laboratorio — un punto de honestidad
fuerte para la ronda de preguntas.""")

code(r"""try:
    df_b, base_b = build_frame('testB')
    X_tab_b_df, _, _ = features_tabulares(df_b, TABULAR_MEASURES)
    X_tab_b_df = X_tab_b_df.reindex(columns=feat_cols, fill_value=0)
    X_tab_b_df[num_cols] = (X_tab_b_df[num_cols] - mean) / std
    X_tab_b = X_tab_b_df.values.astype(np.float32)
    X_img_b = build_images(df_b, base_b, IMG_SIZE)
    y_b = to_categorical(df_b['banda'].values, NUM_CLASSES)

    if best == 0:
        pb = model_1d.predict(X_tab_b)
    elif best == 1:
        pb = model_2d.predict(X_img_b)
    else:
        pb = modelos[best].predict([X_tab_b, X_img_b])
    reporte(y_b, pb, f'{names[best]} en testB (in-the-wild)')
except Exception as e:
    print("testB no disponible o con estructura distinta:", e)""")

# ---------------------------------------------------------------- Conclusiones
md(r"""---
## 8. Conclusiones

**Hitos completados:** 1D (medidas), 2D (silueta), late-fusion y early-fusion —
la misma tecnica de la practica de HAM10000 aplicada a un problema nuevo.

**Que defender en la presentacion:**
- **Ablacion multimodal:** la comparativa muestra cuanta senal aporta cada fuente.
  Las medidas (sobre todo la cintura) ya predicen bastante; la silueta aporta forma;
  la fusion busca lo mejor de ambas.
- **Anti-fuga:** excluir el peso hace que el problema sea de estimacion real y no
  una copia de la formula del IMC.
- **Honestidad:** es una estimacion de fitness, no diagnostico; la caida en testB
  cuantifica el limite del modelo fuera del laboratorio.

**Mejoras futuras:** backbone preentrenado (MobileNet) con siluetas a 3 canales,
data augmentation (flips, rotaciones leves), predecir el IMC como **regresion**
(y luego binar) en vez de clasificar directamente.

**Handoff:** `body_analyzer.keras` + `preprocess.json` alimentan el Hugging Face
Space de la Fase 3, cuya salida (banda + categoria) se inyecta como contexto al
Coach LLM de la Fase 2.

### Referencias
- BodyM Dataset — Registry of Open Data on AWS · https://registry.opendata.aws/bodym/
- Adversarial Body Sim · https://adversarialbodysim.github.io/
- Material del modulo Deep Learning & Computer Vision — KeepCoding AI Bootcamp.
""")

# ---------------------------------------------------------------- write
notebook = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.10"},
        "colab": {"provenance": [], "toc_visible": True},
        "accelerator": "GPU",
    },
    "nbformat": 4,
    "nbformat_minor": 4,
}

with open("01_body_analyzer_bodym.ipynb", "w", encoding="utf-8") as f:
    json.dump(notebook, f, ensure_ascii=False, indent=1)

print(f"Notebook escrito: 01_body_analyzer_bodym.ipynb  ({len(cells)} celdas)")
