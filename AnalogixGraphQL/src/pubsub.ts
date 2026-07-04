import { PubSub } from "graphql-subscriptions";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { Redis as IORedis } from "ioredis";
import { env, isDev } from "./env.js";
import { logger } from "./logger.js";

/**
 * Subscription channels used by the schema. Add new channels here as you
 * add new `Subscription` resolvers.
 */
export interface PubSubChannels {
  // Per-session AI chat streaming
  // Channel name: `chatStream.${sessionId}` — payloads: { token: string, done: boolean }
  [key: `chatStream.${string}`]: { token: string; done: boolean; fullText?: string };
  // Room presence/messages
  [key: `room.${string}.messages`]: unknown;
  [key: `room.${string}.presence`]: unknown;
  [key: `room.${string}.timer`]: unknown;
}

let pubsubInstance: PubSub | null = null;

export function getPubSub(): PubSub {
  if (pubsubInstance) return pubsubInstance;

  if (env.redisUrl) {
    logger.info("[pubsub] Using Redis-backed PubSub");
    const options = {
      publisher: new IORedis(env.redisUrl, { lazyConnect: true }),
      subscriber: new IORedis(env.redisUrl, { lazyConnect: true }),
    };
    pubsubInstance = new RedisPubSub(options) as unknown as PubSub;
  } else if (isDev) {
    logger.warn("[pubsub] No REDIS_URL set — using in-process PubSub (dev only, no horizontal scaling)");
    pubsubInstance = new PubSub();
  } else {
    logger.fatal("[pubsub] REDIS_URL is required in production. Server will not start without a Redis URL.");
    throw new Error("REDIS_URL environment variable is required in production mode for PubSub scaling.");
  }
  return pubsubInstance;
}
