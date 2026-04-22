// src/lib/sanity.ts
import { createClient } from "@sanity/client";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID ?? "";

interface SanityFetchClient {
  fetch<T = unknown>(query: string, params?: Record<string, unknown>): Promise<T>;
}

const noopClient: SanityFetchClient = {
  fetch: async () => [] as unknown as any,
};

if (!projectId) {
  console.warn(
    "[sanity.ts] PUBLIC_SANITY_PROJECT_ID is not set. Using noop client — all queries will return empty arrays."
  );
}

export const client: SanityFetchClient = projectId
  ? createClient({
      projectId,
      dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? "production",
      useCdn: true,
      apiVersion: "2024-01-01",
    })
  : noopClient;

const noopBuilder = {
  width: () => noopBuilder,
  height: () => noopBuilder,
  url: () => "",
} as unknown as ReturnType<ReturnType<typeof imageUrlBuilder>["image"]>;

const builder = projectId ? imageUrlBuilder(client as ReturnType<typeof createClient>) : null;

export function urlFor(source: SanityImageSource) {
  if (!builder) return noopBuilder;
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
