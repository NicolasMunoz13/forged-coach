/**
 * Fuente única de contenido de FORGED.
 * Voz: David Goggins (frases cortas, accountability, "stay hard").
 * Editar aquí cambia toda la web — los componentes solo renderizan.
 */

export const brand = {
  name: "FORGED",
  tagline: "Fuerza y nutrición sin excusas.",
  mantra: "Stay hard.",
  email: "hola@forged.fit",
};

export const nav = [
  { label: "Programas", href: "#programas" },
  { label: "Nutrición", href: "#nutricion" },
  { label: "Resultados", href: "#resultados" },
  { label: "Coach IA", href: "#coach" },
];

export const hero = {
  eyebrow: "Strength & Nutrition",
  title: "Nadie viene a salvarte.",
  titleAccent: "Levanta el peso igualmente.",
  subtitle:
    "Programas de fuerza y protocolos de nutrición sin humo, sin atajos, sin excusas. La motivación se acaba; la disciplina se forja. Empieza hoy, no mañana.",
  ctaPrimary: { label: "Empieza hoy", href: "#programas" },
  ctaSecondary: { label: "Habla con el Coach", href: "#coach" },
  stats: [
    { value: "3", label: "programas de fuerza" },
    { value: "24/7", label: "Coach IA disponible" },
    { value: "0", label: "excusas aceptadas" },
  ],
};

export type Principle = { n: string; title: string; body: string };

export const principles: Principle[] = [
  {
    n: "01",
    title: "El callo mental",
    body: "La mente se rinde mucho antes que el cuerpo. Cada serie que terminas cuando querías parar engrosa el callo. Eso no se compra: se entrena.",
  },
  {
    n: "02",
    title: "El espejo de la responsabilidad",
    body: "Mírate de frente. No hay genética, ni jefe, ni tiempo que valga de excusa. Tus resultados son tuyos. Apropiártelos es el primer rep.",
  },
  {
    n: "03",
    title: "La regla del 40%",
    body: "Cuando crees que estás al límite, vas por el 40%. Queda depósito. Aprende a tirar de él con cabeza y progresarás donde otros abandonan.",
  },
  {
    n: "04",
    title: "Hazlo sin ganas",
    body: "Entrenar con ganas no tiene mérito. El día que no te apetece y vas igual, ahí construyes a la persona que querías ser.",
  },
];

export type Program = {
  name: string;
  level: string;
  weeks: number;
  days: string;
  price: string;
  pitch: string;
  includes: string[];
  featured?: boolean;
};

export const programs: Program[] = [
  {
    name: "Fuerza Base 5×5",
    level: "Principiante",
    weeks: 12,
    days: "3 días/sem",
    price: "29 €",
    pitch: "Lo básico hecho bien hasta que duela. Sentadilla, banca, peso muerto, remo, press. Progresión lineal sin adornos.",
    includes: [
      "Rutina 5×5 con progresión semanal",
      "Vídeos de técnica de los 5 básicos",
      "Hoja de registro de cargas",
      "Guía de calentamiento y movilidad",
    ],
  },
  {
    name: "Hipertrofia Forjada",
    level: "Intermedio",
    weeks: 16,
    days: "4–5 días/sem",
    price: "49 €",
    pitch: "Volumen, tensión y series efectivas. Para cuando ya sabes levantar y quieres construir músculo de verdad.",
    includes: [
      "Split de 4–5 días por grupo muscular",
      "Gestión de volumen y RIR semana a semana",
      "Bloques de descarga programados",
      "Sustituciones por material disponible",
    ],
    featured: true,
  },
  {
    name: "Recomposición Brutal",
    level: "Avanzado",
    weeks: 20,
    days: "5 días/sem",
    price: "79 €",
    pitch: "Perder grasa y ganar fuerza a la vez. Sin magia: déficit inteligente, intensidad alta y paciencia de acero.",
    includes: [
      "Periodización fuerza + acondicionamiento",
      "Protocolo de cardio sin perder músculo",
      "Ajuste de calorías por fases",
      "Auditoría de adherencia quincenal",
    ],
  },
];

export type Protocol = { name: string; rule: string; body: string };

export const protocols: Protocol[] = [
  {
    name: "Proteína Primero",
    rule: "2 g/kg, todos los días",
    body: "Antes de tocar suplementos, asegura la proteína. Es lo que repara lo que rompes en el gimnasio. Sin esto, el resto da igual.",
  },
  {
    name: "Déficit Sin Excusas",
    rule: "−300/−500 kcal, sostenible",
    body: "No hay dieta detox que te salve. Déficit moderado, comida real, constancia. Lento es rápido cuando llegas a meta sin rebote.",
  },
  {
    name: "Volumen Limpio",
    rule: "+10% kcal, calidad ante todo",
    body: "Crecer no es comer basura. Superávit controlado, alimentos densos en nutrientes y la báscula bajo control. Músculo, no relleno.",
  },
];

export type Testimonial = {
  name: string;
  role: string;
  metric: string;
  quote: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "Marcos R.",
    role: "Fuerza Base 5×5",
    metric: "+40 kg sentadilla · 12 sem",
    quote: "Llevaba años de excusas. El plan no negocia contigo: o vas o no vas. Fui. Ahora la sentadilla pesa lo que antes me daba miedo mirar.",
  },
  {
    name: "Laura P.",
    role: "Recomposición Brutal",
    metric: "−9 kg grasa · +fuerza · 20 sem",
    quote: "Sin dietas milagro. Comida real, pesas y dejar de mentirme. La diferencia fue la cabeza, no el plan. El plan solo no me dejó esconderme.",
  },
  {
    name: "Iván G.",
    role: "Hipertrofia Forjada",
    metric: "+6 kg músculo · 16 sem",
    quote: "El Coach IA me sacó las dudas a las 23:40 un domingo. Cero excusas para no entrenar el lunes. Eso es lo que cambia el juego.",
  },
];

export const coach = {
  eyebrow: "Coach IA · RAG",
  title: "Tu coach no duerme.",
  body: "Pregúntale sobre técnica, series, déficit calórico o cómo no rendirte un martes a las 6:00. Responde con el conocimiento de FORGED y te cita la fuente. Sin excusas, sin esperar al lunes.",
  examples: [
    "¿Cuántas series por grupo muscular a la semana?",
    "¿Cómo ajusto el déficit si me estanco?",
    "¿Sentadilla o prensa para empezar?",
  ],
  cta: { label: "Abrir el Coach", href: "/coach" },
};

export const leadMagnet = {
  eyebrow: "Gratis",
  title: "La Guía de las 0 Excusas",
  body: "12 páginas: cómo empezar a entrenar fuerza, montar tu primer déficit y blindar la disciplina cuando la motivación te abandona. Sin relleno.",
  cta: "Descarga la guía",
  placeholder: "tu@email.com",
};
