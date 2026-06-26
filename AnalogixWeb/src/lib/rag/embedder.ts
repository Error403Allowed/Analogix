let pipeline: ((task: string, model: string) => Promise<{ (texts: string[], options: { pooling: string; normalize: boolean }): Promise<{ data: Float32Array; dims: number[] }> }>) | null = null;

let embedFn: ((texts: string[], options: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array; dims: number[] }>) | null = null;

export async function getEmbedder() {
  if (embedFn) return embedFn;

  const { pipeline: pipe } = await import('@xenova/transformers');
  pipeline = pipe as typeof pipeline;
  embedFn = await (pipeline as NonNullable<typeof pipeline>)('feature-extraction', 'Xenova/bge-base-en-v1.5');
  return embedFn as NonNullable<typeof embedFn>;
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
