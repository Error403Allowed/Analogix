import { ApolloProvider } from "@apollo/client";
import { useEffect, useState } from "react";
import { createApolloClient, hydrateApolloCache, persistApolloCache } from "./client";
import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";

let _client: ApolloClient<NormalizedCacheObject> | null = null;
function getClient() {
  if (!_client) _client = createApolloClient();
  return _client;
}

export function ApolloRootProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getClient);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateApolloCache(client).then(() => setReady(true));

    // Persist cache to MMKV every 30s (debounced)
    const id = setInterval(() => persistApolloCache(client), 30_000);
    return () => clearInterval(id);
  }, [client]);

  if (!ready) {
    // Don't block render — let the splash show while we hydrate
    return <>{children}</>;
  }
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
