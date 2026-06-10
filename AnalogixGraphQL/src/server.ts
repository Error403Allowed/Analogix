import http from "node:http";
import express, { type Request } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { expressMiddleware } from "@as-integrations/express5";
import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import { buildContext, type GraphQLContext } from "./context.js";
import { getPubSub } from "./pubsub.js";
import { serviceClient } from "./supabase.js";
import { env, isProd } from "./env.js";
import { logger } from "./logger.js";
import { extractBearerToken } from "./auth/verifyToken.js";

async function main() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const pubsub = getPubSub();

  // Express app
  const app = express();
  const httpServer = http.createServer(app);

  // CORS
  app.use(
    cors({
      origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
      credentials: true,
    })
  );

  // Health
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // WebSocket server (graphql-ws) for subscriptions
  const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx) => {
        // Pull token from connection params (preferred) or initial payload
        const params = (ctx.connectionParams ?? {}) as Record<string, unknown>;
        const raw =
          (params.Authorization as string | undefined) ??
          (params.authorization as string | undefined) ??
          "";
        const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7) : null;
        return buildContext({ token, serviceClient, pubsub, requestId: crypto.randomUUID() });
      },
    },
    wsServer as unknown as Parameters<typeof useServer>[1]
  );

  // Apollo Server
  const apollo = new ApolloServer<GraphQLContext>({
    schema,
    introspection: !isProd,
    plugins: [
      isProd
        ? undefined
        : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ].filter(Boolean),
  });
  await apollo.start();

  app.use(
    "/graphql",
    bodyParser.json({ limit: "50mb" }),
    expressMiddleware(apollo, {
      context: async ({ req }: { req: Request }) => {
        const token = extractBearerToken({ headers: req.headers, url: req.url });
        return buildContext({ token, serviceClient, pubsub, requestId: crypto.randomUUID() });
      },
    })
  );

  // Landing JSON at /
  app.get("/", (_req, res) => {
    res.json({
      name: "AnalogixGraphQL",
      version: "0.1.0",
      graphql: "/graphql",
      subscriptions: "ws://" + (env.corsOrigins[0] ?? "localhost") + "/graphql",
      health: "/health",
    });
  });

  // Boot
  httpServer.listen(env.port, () => {
    logger.info(
      { port: env.port, env: env.nodeEnv },
      `[AnalogixGraphQL] 🚀 ready on http://localhost:${env.port}/graphql (subscriptions on ws://localhost:${env.port}/graphql)`
    );
  });
}

main().catch((err) => {
  logger.fatal({ err }, "Fatal error starting server");
  process.exit(1);
});
