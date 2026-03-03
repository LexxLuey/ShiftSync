import { createRequire } from 'node:module';
import { ConflictError } from '../errors/customErrors.js';

const require = createRequire(import.meta.url);
const Redis = require('ioredis') as new (...args: any[]) => {
  status: string;
  connect: () => Promise<void>;
  set: (...args: any[]) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  on: (event: string, listener: (error: unknown) => void) => void;
};

const redisUrl = process.env.REDIS_URL;

// Use lazy connection to avoid reconnect/error spam during boot when Redis is unavailable.
// @ts-ignore - ioredis v5 type compatibility
const redisClient = redisUrl
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

redisClient.on('error', (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[redis] connection error: ${message}`);
});

const ensureConnected = async (): Promise<void> => {
  if (redisClient.status === 'ready' || redisClient.status === 'connecting') {
    return;
  }

  await redisClient.connect();
};

/**
 * Acquire a distributed lock in Redis
 * @param key - Lock key (e.g., "user:123:lock")
 * @param ttl - Time to live in seconds (default: 5)
 * @throws ConflictError if lock cannot be acquired
 */
export const acquireLock = async (key: string, ttl: number = 5): Promise<void> => {
  await ensureConnected();
  // @ts-ignore - ioredis v5 .set() method signature compatibility
  const result = await redisClient.set(key, '1', 'NX', 'EX', ttl);

  if (result !== 'OK') {
    throw new ConflictError(
      'This resource is being modified by another operation. Please try again.',
      { lockKey: key },
      ['Wait a moment and retry your request.']
    );
  }
};

/**
 * Release a distributed lock in Redis
 * @param key - Lock key to release
 */
export const releaseLock = async (key: string): Promise<void> => {
  await ensureConnected();
  await redisClient.del(key);
};

/**
 * Execute a callback with automatic lock management
 * @param key - Lock key
 * @param callback - Function to execute while holding the lock
 * @returns Result of callback
 */
export const executeWithLock = async <T>(
  key: string,
  callback: () => Promise<T>
): Promise<T> => {
  await acquireLock(key);
  try {
    return await callback();
  } finally {
    await releaseLock(key);
  }
};

export default redisClient;
