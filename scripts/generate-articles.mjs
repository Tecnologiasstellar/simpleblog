// =============================================================================
// WEBHOOK SETUP (Sanity → Replit deploy hook)
// -----------------------------------------------------------------------------
// 1. Go to https://www.sanity.io/manage → select your project → API → Webhooks
// 2. Click "Add webhook"
// 3. URL: [your Replit deploy hook URL]
// 4. Dataset: production
// 5. Filter: _type == "article"
// 6. Trigger on: Create, Update
// 7. Save — Sanity will POST to your Replit URL whenever an article is created
//    or updated, triggering a redeploy.
// =============================================================================

// scripts/generate-articles.mjs
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@sanity/client";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import OpenAI from "openai";

// ── Env guard ─────────────────────────────────────────────────────────────────

const requiredEnv = ["ANTHROPIC_API_KEY", "PUBLIC_SANITY_PROJECT_ID", "SANITY_WRITE_TOKEN"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Fatal: missing environment variable ${key}`);
    process.exit(1);
  }
}

const IMAGE_ENABLED = Boolean(process.env.OPENAI_API_KEY);
if (!IMAGE_ENABLED) {
  console.warn("Warning: OPENAI_API_KEY not set — articles will be published without hero images.");
}

// ── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const sanity = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.PUBLIC_SANITY_DATASET ?? "production",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
  apiVersion: "2024-01-01",
});

const openai = IMAGE_ENABLED
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function toSlug(title) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Image Generation ──────────────────────────────────────────────────────────

async function generateHeroImage(title) {
  const prompt =
    `Serene, calming editorial photograph for a sleep wellness article about ${title}. ` +
    "Soft blue and lavender tones, dreamy atmosphere. No text, no watermarks. Professional magazine quality.";

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    size: "1792x1024",
    quality: "hd",
    n: 1,
  });

  return response.data[0].url;
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

async function readCsv(filePath) {
  const rows = [];
  const rl = createInterface({
    input: createReadStream(filePath),
    crlfDelay: Infinity,
  });

  let headers = null;
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cols = parseCsvLine(trimmed);
    if (!headers) {
      headers = cols;
      continue;
    }
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
    rows.push(row);
  }
  return rows;
}

// ── System Prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt() {
  return `Eres un especialista en medicina del sueño con 15 años de experiencia clínica. Escribes en español con un tono cálido, empático y autoritativo — como un experto hablándole a un amigo de confianza. Nunca suenas robótico ni clínico.

IMPORTANTE: Responde ÚNICAMENTE con JSON válido. Sin texto adicional, sin bloques de código markdown, solo el objeto JSON puro.

El JSON debe tener exactamente esta estructura:
{
  "title": "Título del artículo en español",
  "excerpt": "Descripción de 2-3 oraciones optimizada para SEO en español",
  "category": "Nombre exacto de la categoría tal como se proporcionó",
  "difficulty": "Beginner | Intermediate | Advanced",
  "body": [bloques de Portable Text],
  "steps": [{"name": "Paso 1", "description": "Descripción detallada..."}, ...] o null,
  "seoTitle": "Título SEO en español | Sueño Profundo",
  "seoDescription": "Meta descripción en español de máximo 155 caracteres"
}

REGLAS DE PORTABLE TEXT para el campo "body":
- Cada bloque es un objeto con: _type, _key, style, markDefs, children
- _type siempre es "block"
- _key es un string corto único (ej: "a1b2c3d4")
- style es "normal" para párrafos o "h2" para encabezados de sección
- markDefs siempre es []
- children es un array con UN objeto: {"_type": "span", "_key": "sk-XXXX", "marks": [], "text": "el texto aquí"}
- El artículo debe tener 800-1200 palabras con varios H2 que estructuren el contenido
- Incluye referencias científicas donde sea relevante (mencionadas en el texto, no como links)

REGLAS POR TIPO DE CONTENIDO:
- "Guía": Artículo informativo con explicaciones detalladas. steps = null.
- "Remedio": Artículo con pasos prácticos. Incluye el array steps con 4-7 pasos claros.
- "Receta": Artículo con estructura de receta (ingredientes/preparación). Incluye steps.`;
}

// ── Claude API Call ───────────────────────────────────────────────────────────

async function generateArticle(row) {
  const { keyword, category, difficulty, content_type, search_intent } = row;

  const userPrompt = `Escribe un artículo completo sobre: "${keyword}"
Categoría: ${category}
Dificultad: ${difficulty}
Tipo de contenido: ${content_type}
Intención de búsqueda: ${search_intent}

Recuerda: responde SOLO con el JSON válido, sin nada más.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block) throw new Error(`No text block in Claude response (stop_reason: ${message.stop_reason})`);
  if (message.stop_reason === "max_tokens") {
    throw new Error(`Response truncated (max_tokens) for "${row.keyword}" — increase max_tokens or shorten prompt`);
  }
  if (message.stop_reason !== "end_turn") {
    console.warn(`Warning: unexpected stop_reason "${message.stop_reason}" for "${row.keyword}"`);
  }
  const rawText = block.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(rawText);
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateArticle(data) {
  const required = ["title", "excerpt", "category", "difficulty", "body", "seoTitle", "seoDescription"];
  for (const field of required) {
    if (!data[field]) throw new Error(`Missing required field: ${field}`);
  }
  if (!Array.isArray(data.body) || data.body.length === 0) {
    throw new Error("body must be a non-empty array");
  }
}

// ── Sanity Upload ─────────────────────────────────────────────────────────────

async function uploadToSanity(data) {
  const slug = toSlug(data.title);
  const docId = `article-${slug}`;

  const doc = {
    _id: docId,
    _type: "article",
    title: data.title,
    slug: { _type: "slug", current: slug },
    excerpt: data.excerpt,
    category: data.category,
    difficulty: data.difficulty,
    body: data.body,
    steps: data.steps ?? null,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    image: null,
    publishedAt: new Date().toISOString().split("T")[0],
  };

  await sanity.createOrReplace(doc);
  return slug;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = new URL("./keywords.csv", import.meta.url).pathname;
  const rows = await readCsv(csvPath);
  const total = rows.length;

  console.log(`\n📋 Procesando ${total} artículos...\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const num = `[${i + 1}/${total}]`;

    try {
      const data = await generateArticle(row);
      validateArticle(data);
      const slug = await uploadToSanity(data);
      success++;
      console.log(`✓ ${num} Publicado: ${data.title} (${data.category})`);
    } catch (err) {
      failed++;
      console.error(`✗ ${num} Error en "${row.keyword}": ${err.message}`);
    }

    if (i < rows.length - 1) {
      await delay(3000);
    }
  }

  console.log(`\n📊 Resumen: ${success} publicados, ${failed} fallidos de ${total} totales.\n`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
