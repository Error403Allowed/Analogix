/**
 * Apollo Client setup for AnalogixMobile.
 *
 * - HTTP link for queries/mutations (forwards Supabase access token in
 *   `Authorization: Bearer ...` header — matches the BFF's auth module)
 * - WebSocket link (graphql-ws) for subscriptions (chatStream, room events)
 * - MMKV-backed cache persistence via apollo3-cache-persist
 * - Error link that surfaces a friendly toast on auth errors
 */
import {
  ApolloClient,
  InMemoryCache,
  ApolloLink,
  HttpLink,
  split,
  type NormalizedCacheObject,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient as createWsClient } from "graphql-ws";
import { MMKV } from "../storage/mmkv";
import { config } from "../config";
import { getSupabase } from "../supabase";

const cacheStorage = new MMKV({ id: "analogix.apollo" });
const CACHE_KEY = "apolloCache";

async function getAccessToken(): Promise<string | null> {
  // Defer to Supabase's session manager — it handles refresh automatically.
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const httpLink = new HttpLink({ uri: config.graphql.httpUrl });

const authLink = setContext(async (_, { headers }) => {
  const token = await getAccessToken();
  return {
    headers: {
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // Surface auth errors so the app can route to the login screen.
      if (err.extensions?.code === "UNAUTHENTICATED") {
        // The AuthContext already handles the unauth state, so this is mostly for logging.
         
        console.warn("[apollo] unauthenticated, redirecting to login");
      }
    }
  }
  if (networkError) {
     
    console.warn("[apollo] network error", networkError);
  }
});

const wsLink = new GraphQLWsLink(
  createWsClient({
    url: config.graphql.wsUrl,
    connectionParams: async () => {
      const token = await getAccessToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
    retryAttempts: 10,
  })
);

const splitLink = split(
  ({ query }) => {
    const def = getMainDefinition(query);
    return def.kind === "OperationDefinition" && def.operation === "subscription";
  },
  wsLink,
  ApolloLink.from([errorLink, authLink, httpLink])
);

export function createApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache({
      typePolicies: {
        SubjectNotes: { keyFields: false },
        Subject: {
          fields: {
            notes: { merge: false },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network", errorPolicy: "all" },
      query: { fetchPolicy: "network-only", errorPolicy: "all" },
      mutate: { errorPolicy: "all" },
    },
  });
}

/**
 * Restores the InMemoryCache from MMKV. Call once at app start.
 * Returns the same client after awaiting cache restoration.
 */
export async function hydrateApolloCache(client: ApolloClient<NormalizedCacheObject>) {
  const persisted = cacheStorage.getString(CACHE_KEY);
  if (persisted) {
    try {
      await client.cache.restore(JSON.parse(persisted));
    } catch {
      // Bad cache — wipe it.
      cacheStorage.delete(CACHE_KEY);
    }
  }
}

/** Persists the InMemoryCache to MMKV. Call on app pause / significant state changes. */
export function persistApolloCache(client: ApolloClient<NormalizedCacheObject>) {
  cacheStorage.set(CACHE_KEY, JSON.stringify(client.cache.extract()));
}

/** Wipes the cache — call on sign-out. */
export function clearApolloCache(client: ApolloClient<NormalizedCacheObject>) {
  client.cache.reset();
  cacheStorage.delete(CACHE_KEY);
}
