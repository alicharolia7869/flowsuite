import Redis from 'ioredis';
import { env } from './env';

class MemoryRedisFallback {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && typeof duration === 'number') {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === 'PX' && typeof duration === 'number') {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    const existing = this.store.get(key);
    this.store.set(key, { value: count.toString(), expiresAt: existing?.expiresAt });
    return count;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const item = this.store.get(key);
    if (!item) return 0;
    item.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async flushall(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }
}

let redisClient: Redis | MemoryRedisFallback;
let isRealRedis = false;

try {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't loop endlessly if redis is not running locally
    lazyConnect: true,
  });

  client.on('error', (err) => {
    // Suppress unhandled crash if redis is not running
  });

  // Test connection asynchronously
  client.connect().then(() => {
    isRealRedis = true;
    console.log('Connected to Redis server successfully.');
  }).catch(() => {
    console.log('Redis server not available. Using in-memory Redis fallback for rate limiting & cache.');
  });

  redisClient = client;
} catch (e) {
  redisClient = new MemoryRedisFallback();
}

// Fallback wrapper that protects from connection drops
export const redis = {
  async get(key: string): Promise<string | null> {
    try {
      return await redisClient.get(key);
    } catch {
      return await memoryFallback.get(key);
    }
  },
  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    try {
      return (await (redisClient as any).set(key, value, mode, duration)) || 'OK';
    } catch {
      return await memoryFallback.set(key, value, mode, duration);
    }
  },
  async incr(key: string): Promise<number> {
    try {
      return await redisClient.incr(key);
    } catch {
      return await memoryFallback.incr(key);
    }
  },
  async expire(key: string, seconds: number): Promise<number> {
    try {
      return await redisClient.expire(key, seconds);
    } catch {
      return await memoryFallback.expire(key, seconds);
    }
  },
  async del(key: string): Promise<number> {
    try {
      return await redisClient.del(key);
    } catch {
      return await memoryFallback.del(key);
    }
  }
};

const memoryFallback = new MemoryRedisFallback();
