/**
 * Herramientas (tools) del Coach agente. El LLM decide cuando llamarlas y nosotros
 * las ejecutamos con DATOS REALES:
 *   - buscar_alimento  -> USDA FoodData Central API (macros/porciones reales, live)
 *   - buscar_ejercicios -> Free Exercise DB (873 ejercicios reales, bundled)
 */
import exercisesData from "@/data/exercises.json";

type Exercise = {
  name: string;
  level: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: string | null;
  force: string | null;
  mechanic: string | null;
  instructions: string[];
};

const EXERCISES = exercisesData as Exercise[];

// Declaraciones que ve el modelo (JSON Schema).
export const functionDeclarations = [
  {
    name: "buscar_alimento",
    description:
      "Devuelve informacion nutricional REAL (calorias, proteina, grasa, carbohidratos por 100 g) " +
      "de un alimento, consultando la base de datos oficial USDA FoodData Central. " +
      "Usala siempre que el usuario pregunte por comidas, porciones, calorias o macros de un alimento.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        alimento: {
          type: "string",
          description:
            "Nombre del alimento en INGLES para la busqueda (traduce si hace falta). " +
            "Ej: 'chicken breast', 'white rice', 'olive oil', 'lentils'.",
        },
      },
      required: ["alimento"],
    },
  },
  {
    name: "buscar_ejercicios",
    description:
      "Devuelve ejercicios REALES para un grupo muscular concreto (y opcionalmente un equipo), " +
      "desde la base de datos Free Exercise DB. Usala para construir o ajustar el plan de entrenamiento.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        musculo: {
          type: "string",
          description:
            "Grupo muscular en INGLES. Uno de: chest, lats, middle back, lower back, " +
            "quadriceps, hamstrings, glutes, calves, shoulders, biceps, triceps, forearms, " +
            "abdominals, traps, abductors, adductors, neck.",
        },
        equipo: {
          type: "string",
          description:
            "Opcional. Equipo en INGLES: 'body only', barbell, dumbbell, machine, cable, " +
            "kettlebells, bands, 'exercise ball', 'medicine ball'.",
        },
      },
      required: ["musculo"],
    },
  },
];

// ---------------- ejecucion de cada tool ----------------
async function buscarAlimento(alimento: string) {
  const key = process.env.USDA_API_KEY || "DEMO_KEY";
  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${key}` +
    `&query=${encodeURIComponent(alimento)}&pageSize=1` +
    `&dataType=${encodeURIComponent("Foundation,SR Legacy,Survey (FNDDS)")}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return { error: `USDA respondio ${r.status}` };
    const data = (await r.json()) as {
      foods?: { description: string; foodNutrients?: { nutrientName: string; value: number; unitName: string }[] }[];
    };
    const food = data.foods?.[0];
    if (!food) return { error: `No encontre '${alimento}' en USDA` };

    const want: Record<string, string> = {
      Energy: "kcal",
      Protein: "proteina_g",
      "Total lipid (fat)": "grasa_g",
      "Carbohydrate, by difference": "carbohidratos_g",
    };
    const por_100g: Record<string, number> = {};
    for (const n of food.foodNutrients ?? []) {
      const label = want[n.nutrientName];
      if (!label) continue;
      // Energy puede venir en kcal y kJ; nos quedamos con kcal
      if (n.nutrientName === "Energy" && n.unitName?.toUpperCase() !== "KCAL") continue;
      por_100g[label] = Math.round(n.value * 10) / 10;
    }
    return { alimento: food.description, por_100g, fuente: "USDA FoodData Central" };
  } catch (e) {
    return { error: `Fallo consultando USDA: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function buscarEjercicios(musculo: string, equipo?: string) {
  const m = musculo.toLowerCase().trim();
  const eq = equipo?.toLowerCase().trim();
  let hits = EXERCISES.filter((e) => e.primaryMuscles.some((pm) => pm.toLowerCase() === m));
  if (eq) {
    const byEq = hits.filter((e) => (e.equipment ?? "").toLowerCase() === eq);
    if (byEq.length) hits = byEq;
  }
  const top = hits.slice(0, 6).map((e) => ({
    nombre: e.name,
    equipo: e.equipment,
    nivel: e.level,
    instrucciones: e.instructions.slice(0, 2),
  }));
  return {
    musculo,
    equipo: equipo ?? "cualquiera",
    encontrados: hits.length,
    ejercicios: top,
    fuente: "Free Exercise DB",
  };
}

/** Despacha una llamada a tool por nombre. Devuelve un objeto serializable. */
export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === "buscar_alimento") {
    return buscarAlimento(String(args.alimento ?? ""));
  }
  if (name === "buscar_ejercicios") {
    return buscarEjercicios(String(args.musculo ?? ""), args.equipo ? String(args.equipo) : undefined);
  }
  return { error: `Tool desconocida: ${name}` };
}
