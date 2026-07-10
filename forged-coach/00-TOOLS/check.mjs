#!/usr/bin/env node
/**
 * check.mjs · valida que la paleta del design-system existe en app/globals.css.
 * Evita el antipatrón "se rompió el theme y nadie se enteró".
 * Uso: node 00-TOOLS/check.mjs   (o: npm run check:theme)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

const required = [
  "--color-bg",
  "--color-surface",
  "--color-primary",
  "--color-primary-deep",
  "--color-accent",
  "--color-fg",
  "--color-muted",
  "--color-line",
  "--font-display",
  "--font-sans",
];

const missing = required.filter((token) => !css.includes(token));

if (missing.length) {
  console.error("✗ Faltan tokens de la paleta en app/globals.css:");
  missing.forEach((t) => console.error("   - " + t));
  process.exit(1);
}

console.log(`✓ Theme OK · ${required.length} tokens de la paleta presentes. Stay hard.`);
