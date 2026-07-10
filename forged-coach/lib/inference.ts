/**
 * Inferencia del analizador corporal (Fase 1) EN EL NAVEGADOR con TensorFlow.js.
 * El modelo Keras se convierte a formato tfjs y se sirve desde /public/model/.
 * Este modulo se importa dinamicamente en la pagina (solo cliente).
 */
import * as tf from "@tensorflow/tfjs";
import type { Medidas } from "./types";

export type Preprocess = {
  img_size: number;
  class_names: string[];
  tabular_features: string[];
  numeric_cols: string[];
  scaler_mean: Record<string, number>;
  scaler_std: Record<string, number>;
  needs_image: boolean;
  needs_tabular: boolean;
};

export type Prediccion = {
  banda: string;
  clase_idx: number;
  confianza: number;
  probs: number[];
};

let _model: Promise<tf.LayersModel> | null = null;
let _prep: Promise<Preprocess> | null = null;

export function loadModel(base = "/model"): Promise<tf.LayersModel> {
  if (!_model) _model = tf.loadLayersModel(`${base}/model.json`);
  return _model;
}

export function loadPreprocess(base = "/model"): Promise<Preprocess> {
  if (!_prep)
    _prep = fetch(`${base}/preprocess.json`).then((r) => {
      if (!r.ok) throw new Error("No se encontro /model/preprocess.json");
      return r.json();
    });
  return _prep;
}

/** Vector tabular en el orden exacto de tabular_features (replica el notebook). */
function buildTabular(prep: Preprocess, medidas: Medidas, sexo: string): number[] {
  const numeric = new Set(prep.numeric_cols);
  const key = (col: string) => (col.startsWith("m_") ? col.slice(2) : col); // m_waist -> waist
  const map: Record<string, number | undefined> = {
    waist: medidas.cintura_cm,
    hip: medidas.cadera_cm,
    chest: medidas.pecho_cm,
    thigh: medidas.muslo_cm,
    height: medidas.altura_cm,
  };
  return prep.tabular_features.map((col) => {
    if (numeric.has(col)) {
      const mean = prep.scaler_mean[col] ?? 0;
      const std = prep.scaler_std[col] || 1;
      const raw = map[key(col)];
      const val = raw === undefined || Number.isNaN(raw) ? mean : raw;
      return (val - mean) / std;
    }
    if (col.startsWith("gen_")) return col === `gen_${sexo}` ? 1 : 0;
    return 0;
  });
}

/** Dibuja una imagen en gris a size x size y devuelve un array [size*size] normalizado. */
function toGrayChannel(img: HTMLImageElement | null, size: number): Float32Array | null {
  if (!img) return null;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const out = new Float32Array(size * size);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  }
  return out;
}

/** Imagen de 2 canales (frontal + lateral); si falta el lateral, duplica el frontal. */
function buildImageTensor(
  front: HTMLImageElement | null,
  side: HTMLImageElement | null,
  size: number,
): tf.Tensor4D {
  let f = toGrayChannel(front, size);
  let s = toGrayChannel(side, size);
  if (!f && !s) return tf.zeros([1, size, size, 2]);
  if (!f) f = s!;
  if (!s) s = f;
  const buf = new Float32Array(size * size * 2);
  for (let i = 0; i < size * size; i++) {
    buf[i * 2] = f[i];
    buf[i * 2 + 1] = s[i];
  }
  return tf.tensor4d(buf, [1, size, size, 2]);
}

export async function predecir(args: {
  medidas: Medidas;
  sexo: string;
  front: HTMLImageElement | null;
  side: HTMLImageElement | null;
}): Promise<Prediccion> {
  const [model, prep] = await Promise.all([loadModel(), loadPreprocess()]);

  const tabTensor = prep.needs_tabular
    ? tf.tensor2d([buildTabular(prep, args.medidas, args.sexo)])
    : null;
  const imgTensor = prep.needs_image
    ? buildImageTensor(args.front, args.side, prep.img_size)
    : null;

  let inputs: tf.Tensor | tf.Tensor[];
  if (prep.needs_tabular && prep.needs_image) inputs = [tabTensor!, imgTensor!];
  else if (prep.needs_tabular) inputs = tabTensor!;
  else inputs = imgTensor!;

  const out = model.predict(inputs) as tf.Tensor;
  const probs = Array.from(await out.data());

  tabTensor?.dispose();
  imgTensor?.dispose();
  out.dispose();

  let idx = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[idx]) idx = i;
  return {
    banda: prep.class_names[idx] ?? String(idx),
    clase_idx: idx,
    confianza: probs[idx] ?? 0,
    probs,
  };
}

/** IMC = peso / altura^2 (altura en cm). */
export function calcularIMC(altura_cm?: number, peso_kg?: number): number | null {
  if (!altura_cm || !peso_kg) return null;
  const m = altura_cm / 100;
  return Math.round((peso_kg / (m * m)) * 10) / 10;
}
