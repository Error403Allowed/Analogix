import { createClient } from './client';

let cachedClient: ReturnType<typeof createClient> | null = null;

export function createToolsClient() {
  if (!cachedClient) {
    cachedClient = createClient();
  }
  return cachedClient;
}