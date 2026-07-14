import { ApolloProvider } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { createApolloClient, hydrateApolloCache, persistApolloCache } from "./client";
import type { ApolloClient } from "@apollo/client/core";

let _client: ApolloClient | null = null;
function getClient() {
  if (!_client) _client = createApolloClient();
  return _client;
}

export function ApolloRootProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(getClient);

  useEffect(() => {
    hydrateApolloCache(client);

    const id = setInterval(() => persistApolloCache(client), 30_000);
    return () => clearInterval(id);
  }, [client]);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
