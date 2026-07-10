/**
 * Base de conocimiento del Coach FORGED (RAG).
 * Cada entrada es un "chunk" con su fuente para poder citarla.
 * Corpus curado y compacto: se embebe una vez en frío (ver app/api/coach/route.ts).
 * Datos de fuerza/nutrición basados en evidencia + las bandas de IMC (OMS).
 */
export type Doc = { source: string; text: string };

export const CORPUS: Doc[] = [
  {
    source: "fuerza-basicos",
    text: "Entrenamiento de fuerza. La fuerza se construye sobre patrones de movimiento: sentadilla, peso muerto, press de banca, press militar y remo. Un principiante progresa de forma lineal: +2,5 kg en tren superior y +5 kg en tren inferior por semana mientras la técnica aguante. El esquema 5x5 en los básicos, 3 días/semana, es un punto de partida sólido. Descansa 2-5 min entre series pesadas de fuerza; 1-2 min en hipertrofia.",
  },
  {
    source: "hipertrofia",
    text: "Hipertrofia (ganar músculo). Depende de tensión mecánica, volumen y progresión. Volumen efectivo: 10-20 series semanales por grupo muscular. Empieza en 10-12 y sube solo si te recuperas. Rango útil de repeticiones: 6-12, llevando las series cerca del fallo (0-3 repeticiones en reserva). Sin sobrecarga progresiva no hay crecimiento: añade repeticiones, peso o series y lleva un registro.",
  },
  {
    source: "proteina",
    text: "Proteína. Para quien entrena fuerza: 1,6-2,2 g de proteína por kg de peso corporal al día; un objetivo práctico es 2 g/kg. En déficit calórico ve a la parte alta del rango para preservar músculo. Reparte en 3-5 tomas. Fuentes: carne, pescado, huevos, lácteos, legumbres, tofu y, si hace falta, proteína en polvo. Para vegetarianos/veganos combina legumbres, soja/tofu, seitán y proteína vegetal en polvo.",
  },
  {
    source: "calorias-deficit-superavit",
    text: "Calorías. El peso lo gobierna el balance calórico. Estimación de mantenimiento rápida: 30-33 kcal por kg de peso al día según actividad. Para PERDER grasa: déficit de 300-500 kcal/día, ritmo de 0,5-1% del peso por semana. Para GANAR músculo (volumen limpio): superávit pequeño de 200-300 kcal, ~0,25-0,5% del peso por semana. Tras fijar la proteína, reparte el resto entre carbohidratos (rendimiento) y grasas (no bajar de 0,5 g/kg).",
  },
  {
    source: "estancamiento",
    text: "Romper un estancamiento en déficit. Si la media semanal del peso no baja en 2-3 semanas: primero revisa que mides bien las porciones. Luego elige una: recorta 100-200 kcal, aumenta el gasto (pasos/NEAT, cardio suave) o haz un descanso de dieta en mantenimiento 1-2 semanas. La báscula fluctúa por agua y glucógeno: juzga por la media, no por un día.",
  },
  {
    source: "recuperacion",
    text: "Descanso y recuperación. El músculo crece descansando, no en el gimnasio. Duerme 7-9 horas: es lo que más impacta en recuperación, rendimiento y apetito. Un grupo muscular necesita ~48 h para recuperarse. Señales de fatiga acumulada: rendimiento a la baja varias sesiones, peor sueño, irritabilidad. La solución es una semana de descarga (deload): baja volumen/intensidad 40-50% durante 5-7 días.",
  },
  {
    source: "mentalidad",
    text: "Mentalidad FORGED. La motivación es una emoción y se acaba; la disciplina es una decisión que se entrena. Cada serie que querías abandonar y terminas engrosa el callo mental. Antes de buscar excusas fuera, mírate de frente: tus resultados son consecuencia de tus decisiones. Disciplina no es machacarse a ciegas: presentarte, hacer el trabajo y respetar la recuperación. La meta es la constancia de años. Stay hard.",
  },
  {
    source: "seguridad",
    text: "Seguridad y lesiones. El ardor muscular y las agujetas leves son normales. El dolor agudo, punzante o articular NO lo es: para y revisa. Consulta a un médico o fisioterapeuta ante dolor articular persistente, hormigueo, pérdida de fuerza, mareo o dolor en el pecho. Un coach o una IA no diagnostican ni sustituyen atención médica. Si tienes una condición médica o llevas años inactivo, habla con tu médico antes de empezar.",
  },
  {
    source: "bandas-imc",
    text: "Bandas de IMC (OMS) y enfoque. Bajo peso (IMC < 18,5): prioriza superávit calórico y fuerza para ganar masa; sube calorías con comida densa. Normal (18,5-24,9): recomposición o mantenimiento según objetivo. Sobrepeso (25-29,9): déficit moderado + fuerza para perder grasa preservando músculo; la cintura es buen marcador de progreso. Obesidad (>= 30): déficit sostenible, mucho caminar (NEAT), fuerza suave y constancia; cambios de hábitos por encima de dietas extremas. El IMC es orientativo y no distingue músculo de grasa.",
  },
  {
    source: "cintura-riesgo",
    text: "Cintura y salud. El perímetro de cintura estima la grasa abdominal (la de mayor riesgo). Orientativo: riesgo elevado por encima de ~102 cm en hombres y ~88 cm en mujeres. Reducir cintura es un objetivo más útil que solo mirar la báscula, porque refleja pérdida de grasa visceral. Combina déficit moderado, proteína alta, fuerza y pasos diarios.",
  },
];
