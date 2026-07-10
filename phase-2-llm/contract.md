# Contrato de interfaces · FORGED Coach

Documento único de la verdad para cómo se comunican las 3 fases. Si cambia el JSON,
cambia aquí primero.

## 1. Salida de Fase 1 (analizador DL) → entrada del Coach

El modelo de Deep Learning (`body_analyzer.keras` + `preprocess.json`) produce un
**perfil** con esta forma. Es lo que el frontend (Fase 3) envía al Coach.

```json
{
  "banda": "Sobrepeso",
  "clase_idx": 2,
  "imc": 27.3,
  "confianza": 0.71,
  "medidas": {
    "altura_cm": 175,
    "peso_kg": 84.0,
    "cintura_cm": 95,
    "cadera_cm": 102,
    "pecho_cm": 104
  },
  "objetivo": "perder grasa",
  "restricciones": "vegetariano",
  "sexo": "male"
}
```

| Campo | Origen | Obligatorio | Notas |
|---|---|:--:|---|
| `banda` | modelo DL | ✔ | una de: `Bajo peso`, `Normal`, `Sobrepeso`, `Obesidad` |
| `clase_idx` | modelo DL | ✔ | 0–3, coincide con `CLASS_NAMES` de Fase 1 |
| `imc` | calculado (peso/altura²) | ✖ | referencia numérica; puede omitirse |
| `confianza` | softmax del modelo | ✖ | para mostrar "estimación", no diagnóstico |
| `medidas` | formulario del usuario | ✔ | las que el usuario haya introducido |
| `objetivo` | formulario | ✔ | texto libre (perder grasa, ganar músculo, …) |
| `restricciones` | formulario | ✖ | alergias, dieta, lesiones |
| `sexo` | formulario/DL | ✖ | ajusta recomendaciones |

## 2. Entrada del Coach (API del Space)

`coach(perfil: dict, pregunta: str) -> str`

- `perfil`: el JSON de arriba.
- `pregunta`: la duda del usuario (o vacío para pedir el plan inicial).
- Devuelve: **texto markdown** con el plan (nutrición + entrenamiento) + descargo.

## 3. Salida del Coach → Fase 3 (frontend)

Markdown estructurado. El frontend lo renderiza como tarjetas. Estructura esperada:

```
## Tu situación
（1 frase honesta basada en la banda de IMC）

## Nutrición
- calorías objetivo aprox. y reparto de macros
- 3–4 pautas concretas

## Entrenamiento
- frecuencia semanal + tipo
- progresión

## Siguiente paso
（1 acción para hoy）

> Esto es una estimación de fitness, no consejo médico. Ante dudas de salud,
> consulta a un profesional.
```

## 4. Reglas del sistema (persona)

- Voz **FORGED / Goggins**: directa, sin excusas, frases cortas, español.
- **Usa el contexto RAG** para los datos (calorías, ejercicios); no inventes cifras.
- **Personaliza** con la banda de IMC y las medidas del perfil.
- Si la pregunta es médica (dolor, enfermedad, medicación) → deriva a un profesional.
- Cierra siempre con el descargo de "no es consejo médico".

## 5. Variables de entorno / secretos

| Variable | Dónde | Para qué |
|---|---|---|
| `GEMINI_API_KEY` | secret del HF Space / Colab userdata | generación LLM Gemini (gratis) |
| `GEMINI_MODEL` | opcional | modelo Gemini (def. `gemini-2.5-flash`) |
| `HF_TOKEN` | Colab | subir el adapter QLoRA al Hub |
| `NEXT_PUBLIC_COACH_URL` | Vercel (Fase 3) | URL del Space embebido |
