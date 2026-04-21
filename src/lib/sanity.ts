// src/lib/sanity.ts
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
if (!projectId) {
  throw new Error("Missing required env var: PUBLIC_SANITY_PROJECT_ID");
}

export const client = createClient({
  projectId,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? "production",
  useCdn: true,
  apiVersion: "2024-01-01",
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const normalized = dateString.includes("T") ? dateString : `${dateString}T12:00:00Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function categoryToSlug(category: string): string {
  if (!category) return "";
  return category
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
