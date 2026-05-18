"use client";

import { ApolloClient, HttpLink, InMemoryCache, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { createClient } from "@/lib/supabase/client";

const graphqlUrl =
  process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "/api/graphql";

const supabase = createClient();

const authLink = setContext(async (_, { headers }) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([
    authLink,
    new HttpLink({
      uri: graphqlUrl,
      credentials: "include",
    }),
  ]),
  cache: new InMemoryCache(),
});
