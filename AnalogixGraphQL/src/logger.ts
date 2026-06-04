import pino from "pino";
import { env, isDev } from "./env.js";

export const logger = pino({
  level: env.logLevel,
  ...(isDev
    ? {
        transport: {
          target: "pino/file",
          options: { destination: 1 },
        },
      }
    : {}),
});
