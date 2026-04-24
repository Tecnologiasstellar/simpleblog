// scripts/smoke-test-image.mjs
// Smoke test: generate 1 DALL-E image and upload to Sanity.
// Does NOT create an article document — just verifies the pipeline.
// Usage: node scripts/smoke-test-image.mjs

import { createClient } from "@sanity/client";
import OpenAI from "openai";

const required = ["OPENAI_API_KEY", "PUBLIC_SANITY_PROJECT_ID", "SANITY_WRITE_TOKEN"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Fatal: missing env variable ${key}`);
    process.exit(1);
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const sanity = createClient({
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.PUBLIC_SANITY_DATASET ?? "production",
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
  apiVersion: "2024-01-01",
});

async function main() {
  console.log("🧪 Smoke test: DALL-E 3 → Sanity upload\n");

  console.log("1/3  Generando imagen (1024x1024, standard)...");
  const t0 = Date.now();
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: "A serene, abstract representation of peaceful sleep. Soft blue and lavender gradient, dreamy atmosphere. No text.",
    size: "1024x1024",
    quality: "standard",
    n: 1,
  });
  const url = response.data?.[0]?.url;
  if (!url) throw new Error("DALL-E returned no URL");
  console.log(`     ✓ Imagen generada (${Date.now() - t0}ms)`);
  console.log(`     URL: ${url.slice(0, 80)}...`);

  console.log("\n2/3  Descargando imagen...");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`     ✓ ${buffer.length} bytes`);

  console.log("\n3/3  Subiendo a Sanity...");
  const asset = await sanity.assets.upload("image", buffer, {
    filename: `smoke-test-${Date.now()}.jpg`,
  });
  console.log(`     ✓ Asset subido: ${asset._id}`);
  console.log(`     URL: ${asset.url}`);

  console.log("\n✅ Smoke test passed. Safe to run full generation.\n");
}

main().catch((err) => {
  console.error("\n❌ Smoke test failed:", err.message);
  if (err.response) console.error(err.response);
  process.exit(1);
});
