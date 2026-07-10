# Fase 1 · Analizador Corporal Multimodal (Deep Learning)

Componente de Deep Learning del proyecto final **FORGED · Multimodal Fitness Coach**.
Estima la **banda de IMC** (OMS) de una persona a partir de su **silueta** + **medidas
corporales**, usando la misma técnica de la práctica de HAM10000: modelo 1D tabular +
modelo 2D CNN + late-fusion + early-fusion.

## Archivos
- `01_body_analyzer_bodym.ipynb` — el notebook (entregable, ejecutable en Colab).
- `build_notebook.py` — script que genera el notebook (garantiza JSON válido; reproducible).
- `space/` — **Hugging Face Space (Gradio)** que sirve el modelo entrenado: recibe
  imagen + medidas y devuelve el `perfil` (banda de IMC). Es el endpoint que llama el
  frontend de la Fase 3. Súbele `body_analyzer.keras` + `preprocess.json` (los genera
  el notebook). Ver `space/README.md`.

## Cómo ejecutarlo (Google Colab)
1. Sube `01_body_analyzer_bodym.ipynb` a [Colab](https://colab.research.google.com).
2. **Entorno de ejecución → Cambiar tipo de entorno → GPU (T4)**.
3. Ejecuta las celdas de arriba abajo. No necesitas cuenta de AWS: el dataset se baja
   del bucket público con `--no-sign-request`.
4. Al final se guardan `body_analyzer.keras` + `preprocess.json` (el handoff a Fase 3).

> El notebook usa el dataset **BodyM** (CC BY-NC 4.0, uso académico). Cítalo en la
> presentación.

## Estructura del dataset (verificada contra el bucket S3)
```
<split>/                         split = train | testA | testB
  hwg_metadata.csv               subject_id, gender, height_cm, weight_kg
  measurements.csv               subject_id, ankle, arm-length, ..., waist, wrist  (14 medidas)
  subject_to_photo_map.csv       subject_id, photo_id   (un sujeto -> varias fotos)
  mask/        <photo_id>.png     silueta FRONTAL (blanco y negro)
  mask_left/   <photo_id>.png     silueta LATERAL
```
El notebook está cableado a este esquema real. Aun así, la sección 3 imprime las
columnas y carpetas detectadas como comprobación. Si algún día cambian, se ajusta la
celda de **CONFIGURACIÓN** (`FRONT_DIR`, `SIDE_DIR`, `TABULAR_MEASURES`). La detección
de unidades de altura (cm→m) es automática: revisa que la mediana de IMC sea ~22–27.

## Decisiones de diseño (para defender en la presentación)
- **Anti-fuga:** el modelo 1D **no** recibe el peso, porque `IMC = peso/altura²`.
  Así el problema es de *estimación real*, no de copiar la fórmula.
- **Imagen de 2 canales:** silueta frontal + lateral apiladas → más información de forma.
- **CNN desde cero** (no transfer learning): las siluetas binarias están fuera de la
  distribución de ImageNet; una CNN propia es más apropiada. (Transfer learning =
  mejora opcional.)
- **`class_weight`** para el desbalanceo (la banda "Normal" domina).
- **Split oficial:** `train` → train/val; `testA` → test; `testB` → robustez in-the-wild.
- **Ablación multimodal:** la comparativa (1D solo medidas vs 2D solo imagen vs fusión)
  es la evidencia de cuánto aporta cada fuente.

## Handoff a las siguientes fases
`body_analyzer.keras` + `preprocess.json` → se suben al Hugging Face Space (Fase 3).
La salida del modelo (banda + categoría) se inyecta como contexto al Coach LLM (Fase 2).

## Ajustes rápidos
| Quiero… | Cambia en la celda de CONFIGURACIÓN |
|---|---|
| Más resolución de imagen | `IMG_SIZE = 128` (necesita más RAM/GPU) |
| Otras medidas de entrada | `TABULAR_MEASURES = [...]` |
| Otro split de test | `SPLIT_TEST = "testB"` |
