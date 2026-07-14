import { ApolloClient, InMemoryCache, ApolloLink } from "@apollo/client/core";
import { HttpLink } from "@apollo/client/link/http";
import { SetContextLink } from "@apollo/client/link/context";
import { ErrorLink } from "@apollo/client/link/error";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { createClient } from "@/lib/supabase/client";

function getGraphQlUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL;
    if (envUrl) return envUrl;
  }
  return "http://localhost:4000/graphql";
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const httpLink = new HttpLink({ uri: getGraphQlUrl() });

const authLink = new SetContextLink(async (prevContext) => {
  const token = await getAccessToken();
  return {
    ...prevContext,
    headers: {
      ...(prevContext.headers ?? {}),
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

export function createApolloClient(): ApolloClient {
  return new ApolloClient({
    link: ApolloLink.from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network", errorPolicy: "all" as const },
      query: { fetchPolicy: "network-only", errorPolicy: "all" as const },
      mutate: { errorPolicy: "all" as const },
    } as unknown as ApolloClient.DefaultOptions.Input,
  });
}
