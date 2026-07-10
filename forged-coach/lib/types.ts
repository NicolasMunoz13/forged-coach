/** Contrato compartido entre el analizador (Fase 1, en el navegador) y el Coach (API). */
export type Medidas = {
  altura_cm?: number;
  peso_kg?: number;
  cintura_cm?: number;
  cadera_cm?: number;
  pecho_cm?: number;
  muslo_cm?: number;
};

export type Perfil = {
  banda: string;         // "Bajo peso" | "Normal" | "Sobrepeso" | "Obesidad"
  clase_idx: number;     // 0..3
  imc: number | null;
  confianza: number;     // 0..1
  sexo: string;          // "male" | "female"
  medidas: Medidas;
  objetivo: string;
  restricciones: string;
};

export type CoachRequest = { perfil: Perfil; pregunta?: string };
export type CoachResponse = { plan: string; fuentes: string[] };
