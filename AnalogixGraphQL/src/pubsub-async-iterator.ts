import type { PubSub } from "graphql-subscriptions";

export function pubsubAsyncIterator<T = unknown>(
  pubsub: PubSub,
  topics: string[],
): AsyncIterableIterator<T> {
  const topic = topics[0];
  const pushQueue: T[] = [];
  const pullQueue: Array<(value: IteratorResult<T>) => void> = [];
  let running = true;
  let subscriptionId: number | null = null;

  async function subscribe() {
    subscriptionId = await pubsub.subscribe(topic, (payload: T) => {
      if (pullQueue.length > 0) {
        const resolve = pullQueue.shift()!;
        resolve({ value: payload, done: false });
      } else {
        pushQueue.push(payload);
      }
    });
  }

  let subscribed = false;

  async function ensureSubscribed() {
    if (!subscribed) {
      subscribed = true;
      await subscribe();
    }
  }

  async function cleanup(): Promise<IteratorResult<T>> {
    running = false;
    if (subscriptionId != null) {
      pubsub.unsubscribe(subscriptionId);
      subscriptionId = null;
    }
    pullQueue.forEach((resolve) => resolve({ value: undefined as unknown as T, done: true }));
    pullQueue.length = 0;
    pushQueue.length = 0;
    return { value: undefined as unknown as T, done: true };
  }

  const iterator: AsyncIterableIterator<T> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next(): Promise<IteratorResult<T>> {
      await ensureSubscribed();
      if (pushQueue.length > 0) {
        return { value: pushQueue.shift()!, done: false };
      }
      if (!running) {
        return { value: undefined as unknown as T, done: true };
      }
      return new Promise<IteratorResult<T>>((resolve) => {
        pullQueue.push(resolve);
      });
    },
    return: cleanup,
    async throw(error: unknown): Promise<IteratorResult<T>> {
      await cleanup();
      return Promise.reject(error);
    },
  };

  return iterator;
}
