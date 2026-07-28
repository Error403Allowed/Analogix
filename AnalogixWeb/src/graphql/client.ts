import { ApolloClient, InMemoryCache, ApolloLink, split } from "@apollo/client/core";
import { HttpLink } from "@apollo/client/link/http";
import { setContext } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient as createWsClient } from "graphql-ws";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "@/lib/supabase/client";

function getGraphQlUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL;
    if (envUrl) return envUrl;
  }
  return "http://localhost:4000/graphql";
}

function getGraphQlWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:4000/graphql";
  const httpUrl = getGraphQlUrl();
  return httpUrl.replace(/^http/, "ws");
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const httpLink = new HttpLink({ uri: getGraphQlUrl() });

let wsLink: GraphQLWsLink | undefined;
if (typeof window !== "undefined") {
  wsLink = new GraphQLWsLink(
    createWsClient({
      url: getGraphQlWsUrl(),
      connectionParams: async () => {
        const token = await getAccessToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      retryAttempts: 5,
      shouldRetry: () => true,
    }),
  );
}

const authLink = setContext(async (prevContext) => {
  const token = await getAccessToken();
  const prev = prevContext as Record<string, unknown>;
  return {
    ...prevContext,
    headers: {
      "Content-Type": "application/json",
      ...(typeof prev.headers === "object" && prev.headers ? (prev.headers as Record<string, string>) : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

const errorLink = new ErrorLink(({ error }) => {
  if (CombinedGraphQLErrors.is(error)) {
    for (const err of error.errors) {
      if (err.extensions?.code === "UNAUTHENTICATED") {
        console.warn("[apollo] unauthenticated");
      }
    }
  } else {
    console.warn("[apollo] network error", error);
  }
});

const terminatingLink = typeof window !== "undefined" && wsLink
  ? split(
      ({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === "OperationDefinition" && def.operation === "subscription";
      },
      wsLink,
      httpLink,
    )
  : httpLink;

export function createApolloClient(): ApolloClient {
  return new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, terminatingLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network", errorPolicy: "all" as const },
      query: { fetchPolicy: "network-only", errorPolicy: "all" as const },
      mutate: { errorPolicy: "all" as const },
    } as unknown as ApolloClient.DefaultOptions.Input,
  });
}
