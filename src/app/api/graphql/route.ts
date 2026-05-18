import { createYoga } from "graphql-yoga";
import { readFileSync } from "fs";
import { join } from "path";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { resolvers } from "@/lib/graphql/resolvers";
import { createContext } from "@/lib/graphql/context";

const typeDefs = readFileSync(
  join(process.cwd(), "src/lib/graphql/schema.graphql"),
  "utf-8"
);

const schema = makeExecutableSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: "/api/graphql",
  cors: (request: Request) => {
    const origin = request.headers.get("origin");
    return {
      origin: origin ?? "*",
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    };
  },
  landingPage: process.env.NODE_ENV === "development",
});

export { yoga as GET, yoga as POST };
