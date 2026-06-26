import { logger } from "../logger.js";

type EmbedFn = (texts: string[], options: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;

let embedFn: EmbedFn | null = null;

export async function getEmbedder(): Promise<EmbedFn> {
  if (embedFn) return embedFn;

  const { pipeline } = await import("@xenova/transformers");
  embedFn = await (pipeline as unknown as (task: string, model: string) => Promise<EmbedFn>)(
    "feature-extraction",
    "Xenova/bge-base-en-v1.5"
  );
  logger.info("[rag] Embedding model loaded");
  return embedFn;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const fn = await getEmbedder();
  const result = await fn([text], { pooling: "mean", normalize: true });
  return Array.from(result.data);
}
