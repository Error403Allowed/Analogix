// NOTE: @huggingface/transformers is intentionally imported LAZILY (dynamic
// import) and never statically. Its native onnxruntime binding does not exist
// on serverless runtimes (Vercel Lambda), so any static import would throw
// "cannot open shared object file" at module-evaluation time and crash every
// route that reaches here - even ones that never perform RAG.

// In serverless runtimes (Vercel, etc.) node_modules is read-only, so the model
// cache must live somewhere writable. Downloads are shared per-instance there.
const writableCacheDir =
  process.env.TRANSFORMERS_CACHE_DIR ||
  (process.env.NODE_ENV === 'production'
    ? '/tmp/transformers-cache'
    : undefined);

type EmbedFn = (texts: string[], options: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>;

let embedFn: EmbedFn | null = null;

export async function getEmbedder(): Promise<EmbedFn> {
  if (embedFn) return embedFn;

  const { env, pipeline } = await import('@huggingface/transformers');
  if (writableCacheDir) {
    env.cacheDir = writableCacheDir;
  }
  embedFn = (await (pipeline as (task: string, model: string, options?: { dtype?: string }) => Promise<EmbedFn>)(
    'feature-extraction',
    'Xenova/bge-base-en-v1.5',
    { dtype: 'fp32' }
  )) as EmbedFn;
  return embedFn;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const fn = await getEmbedder();
  const result = await fn([text], { pooling: 'mean', normalize: true });
  return Array.from(result.data);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const fn = await getEmbedder();
  const result = await fn(texts, { pooling: 'mean', normalize: true });
  const dims = result.dims;
  const batchSize = dims[0];
  const embeddingDim = dims[1];
  const embeddings: number[][] = [];
  for (let i = 0; i < batchSize; i++) {
    embeddings.push(Array.from(result.data.slice(i * embeddingDim, (i + 1) * embeddingDim)));
  }
  return embeddings;
}
