import Redis from 'ioredis';
import { ConflictError } from '../errors/customErrors.js';

// Simple Redis client for distributed locking
// @ts-ignore - ioredis v5 type compatibility
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
});

/**
 * Acquire a distributed lock in Redis
 * @param key - Lock key (e.g., "user:123:lock")
 * @param ttl - Time to live in seconds (default: 5)
 * @throws ConflictError if lock cannot be acquired
 */
export const acquireLock = async (key: string, ttl: number = 5): Promise<void> => {
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
