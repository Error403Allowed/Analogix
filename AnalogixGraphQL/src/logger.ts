import pino from "pino";
import { env, isDev } from "./env.js";

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "err.headers.authorization",
      "body.access_token",
      "body.refresh_token",
      "body.token",
      "headers.authorization",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino/file",
          options: { destination: 1 },
        },
      }
    : {}),
});
