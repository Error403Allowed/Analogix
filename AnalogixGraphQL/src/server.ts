import http from "node:http";
import express, { type Request } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import rateLimit from "express-rate-limit";
import { WebSocketServer } from "ws";
import { useServer, type Extra } from "graphql-ws/use/ws";
import type { Context as WsContext } from "graphql-ws";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { expressMiddleware } from "@as-integrations/express5";
import { GraphQLError, type DocumentNode } from "graphql";
import { typeDefs } from "./schema/index.js";
import { resolvers } from "./resolvers/index.js";
import { buildContext, type GraphQLContext } from "./context.js";
import { getPubSub } from "./pubsub.js";
import { env, isProd } from "./env.js";
import { logger } from "./logger.js";
import { extractBearerToken } from "./auth/verifyToken.js";

async function main() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  const pubsub = getPubSub();

  // Express app
  const app = express();
  const httpServer = http.createServer(app);

  // CORS — explicit origins only; wildcard is never allowed with credentials
  if (env.corsOrigins.includes("*")) {
    logger.warn("[cors] CORS_ORIGINS contains '*' — falling back to localhost for safety. Set explicit origins in production.");
    env.corsOrigins = ["http://localhost:3000"];
  }
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    })
  );

  // Body parser must run before rate limiters so auth limiter can inspect query body
  app.use("/graphql", bodyParser.json({ limit: "5mb" }));

  // Log request details on 400 errors for debugging
  app.use("/graphql", (req, res, next) => {
    const originalStatus = res.status.bind(res);
    res.status = function (code: number) {
      if (code >= 400 && code < 500) {
        logger.warn(
          { statusCode: code, method: req.method, url: req.url, query: (req.body as Record<string, unknown>)?.query },
          "[graphql] client error"
        );
      }
      return originalStatus(code);
    };
    next();
  });

  // Global rate limiting (skip health endpoint)
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
    skip: (req) => req.path === "/health",
  });
  app.use(globalLimiter);

  // Stricter rate limit for auth mutations only
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth requests, please try again later." },
    skip: (req) => {
      if (req.method !== "POST" || !req.body?.query) return true;
      const op = (req.body.query as string).toLowerCase();
      const authOps = ["login", "signup", "register", "forgotpassword", "resetpassword", "changepassword"];
      return !authOps.some((kw) => op.includes(kw));
    },
  });
  app.use("/graphql", authLimiter);

  // Health
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // WebSocket server (graphql-ws) for subscriptions
  const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx: WsContext<Record<string, unknown>, Extra>) => {
        // Pull token from connection params (preferred) or initial payload
        const params = ctx.connectionParams ?? {};
        const raw =
          (params.Authorization as string | undefined) ??
          (params.authorization as string | undefined) ??
          "";
        const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7) : null;
        return buildContext({ token, pubsub, requestId: crypto.randomUUID() });
      },
    },
    wsServer as unknown as Parameters<typeof useServer>[1]
  );

  // Apollo Server
  // GraphQL query depth limit — prevents deeply nested malicious queries
  const depthLimit = (await import("graphql-depth-limit")).default;
  const { getComplexity, simpleEstimator, fieldExtensionsEstimator } = await import("graphql-query-complexity");

  const apollo = new ApolloServer<GraphQLContext>({
    schema,
    introspection: !isProd,
    csrfPrevention: false,
    validationRules: [
      depthLimit(7),
    ],
    plugins: [
      isProd
        ? undefined
        : ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      {
        async requestDidStart() {
          return {
            async didResolveOperation({ request, document }: { request: { operationName?: string | null; variables?: Record<string, unknown> }; document: DocumentNode }) {
              // Query complexity guard. Runs after variable coercion so the
              // estimator can see real argument values (validationRules have no
              // access to request variables, which breaks every variable query).
              try {
                const complexity = getComplexity({
                  schema,
                  operationName: request.operationName ?? undefined,
                  query: document,
                  variables: request.variables,
                  estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
                });
                if (complexity > 1000) {
                  throw new GraphQLError(
                    `The query exceeds the maximum complexity of 1000. Actual complexity is ${complexity}`
                  );
                }
              } catch (err) {
                if (err instanceof GraphQLError && /exceeds the maximum complexity/.test(err.message)) {
                  throw err;
                }
                // Ignore variable-coercion noise from getComplexity; real
                // missing-variable errors are surfaced during execution.
              }
            },
          };
        },
      },
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ].filter((p): p is NonNullable<typeof p> => p != null),
  });
  await apollo.start();

  app.use(
    "/graphql",
    expressMiddleware(apollo, {
      context: async ({ req }: { req: Request }) => {
        const token = extractBearerToken({ headers: req.headers });
        return buildContext({ token, pubsub, requestId: crypto.randomUUID() });
      },
    })
  );

  // Landing JSON at /
  app.get("/", (_req, res) => {
    res.json({
      name: "AnalogixGraphQL",
      graphql: "/graphql",
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
