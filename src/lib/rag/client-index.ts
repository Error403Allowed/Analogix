/**
 * Client-side helper for browser stores to sync embeddings with the server.
 * Browser stores (subjectStore, flashcardStore, eventStore) cannot run the
 * transformer model inline, so they POST the entity content to /api/rag/index
 * which computes and stores the embedding server-side.
 */

export interface ClientIndexInput {
  entityType: string;
  entityId: string;
  subjectId?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
}

export async function clientIndexEntity(input: ClientIndexInput): Promise<boolean> {
  try {
    const res = await fetch("/api/rag/index", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      console.warn("[clientIndexEntity] Failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[clientIndexEntity] Error:", err);
    return false;
  }
}

export async function clientUnindexEntity(entityType: string, entityId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/rag/index?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      console.warn("[clientUnindexEntity] Failed:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[clientUnindexEntity] Error:", err);
    return false;
  }
}