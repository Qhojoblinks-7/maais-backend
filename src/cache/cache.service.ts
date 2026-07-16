import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

@Injectable()
export class CacheService implements OnModuleInit {
  private client: Redis | null = null;
  private readonly defaultTTL = 300; // 5 minutes
  private readonly enabled = () => !!process.env.REDIS_URL;
  private readonly lockTTL = 60; // 1 minute max lock hold
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly memoryCache = new Map<string, CacheEntry<unknown>>();
  private readonly memoryCacheMaxSize = 1000;
  private redisHealthy = true;
  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerResetMs = 30_000;
  private recentErrors = 0;
  private lastErrorTime = 0;

  onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.warn(
        '[CacheService] REDIS_URL not set — running without Redis cache',
      );
      return;
    }

    this.client = new Redis(url, {
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        console.warn(
          `[CacheService] Redis connection retry #${times} in ${delay}ms`,
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    this.client.on('connect', () =>
      console.log('[CacheService] Redis connected'),
    );
    this.client.on('error', (err) =>
      console.error('[CacheService] Redis error', err.message),
    );
  }

  private async clientOrWarn<T>(fallback: T): Promise<T> {
    if (!this.enabled()) return fallback;
    if (!this.client) return fallback;
    if (!this.isRedisHealthy()) return fallback;
    return fallback;
  }

  private isRedisHealthy(): boolean {
    const now = Date.now();
    if (!this.redisHealthy) {
      if (now - this.lastErrorTime > this.circuitBreakerResetMs) {
        this.redisHealthy = true;
        this.recentErrors = 0;
      } else {
        return false;
      }
    }
    return true;
  }

  private recordRedisError(): void {
    this.recentErrors += 1;
    this.lastErrorTime = Date.now();
    if (this.recentErrors >= this.circuitBreakerThreshold) {
      this.redisHealthy = false;
      console.warn(
        `[CacheService] Circuit breaker opened after ${this.recentErrors} errors. Redis disabled for ${this.circuitBreakerResetMs}ms`,
      );
    }
  }

  private recordRedisSuccess(): void {
    if (this.recentErrors > 0) {
      this.recentErrors = Math.max(0, this.recentErrors - 1);
    }
  }

  private cleanMemoryCache() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
    if (this.memoryCache.size > this.memoryCacheMaxSize) {
      const entries = Array.from(this.memoryCache.entries()).sort(
        (a, b) => a[1].expiresAt - b[1].expiresAt,
      );
      for (let i = 0; i < entries.length / 2; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      if (entry.expiresAt > Date.now()) {
        return entry.value as T;
      }
      this.memoryCache.delete(key);
    }

    if (!this.client || !this.isRedisHealthy()) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      try {
        this.recordRedisSuccess();
        return JSON.parse(raw) as T;
      } catch {
        this.recordRedisSuccess();
        return raw as unknown as T;
      }
    } catch {
      this.recordRedisError();
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds = this.defaultTTL,
  ): Promise<void> {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.cleanMemoryCache();

    if (!this.client || !this.isRedisHealthy()) return;
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
      this.recordRedisSuccess();
    } catch {
      this.recordRedisError();
    }
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
    if (!this.client || !this.isRedisHealthy()) return;
    try {
      await this.client.del(key);
      this.recordRedisSuccess();
    } catch {
      this.recordRedisError();
    }
  }

  private buildKey(prefix: string, identifier: string): string {
    return `maais:cache:${prefix}:${identifier}`;
  }

  async getCachedAggregate<T>(
    prefix: string,
    identifier: string,
  ): Promise<T | null> {
    return this.get<T>(this.buildKey(prefix, identifier));
  }

  async setCachedAggregate<T>(
    prefix: string,
    identifier: string,
    value: T,
    ttlSeconds = this.defaultTTL,
  ): Promise<void> {
    await this.set(this.buildKey(prefix, identifier), value, ttlSeconds);
  }

  async invalidateAggregate(
    prefix: string,
    identifier?: string,
  ): Promise<void> {
    if (identifier) {
      await this.del(this.buildKey(prefix, identifier));
      return;
    }
    if (!this.client || !this.isRedisHealthy()) return;
    const pattern = `maais:cache:${prefix}:*`;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {
      // Swallow
    }
  }

  async getWithRefresh<T>(
    prefix: string,
    identifier: string,
    refresh: () => Promise<T>,
    ttlSeconds = this.defaultTTL,
  ): Promise<T> {
    const key = this.buildKey(prefix, identifier);
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const inFlight = this.inFlight.get(key);
    if (inFlight) {
      return (await inFlight) as T;
    }

    const lockKey = `${key}:lock`;
    const promise = (async () => {
      try {
        const fresh = await refresh();
        await this.set(key, fresh, ttlSeconds);
        return fresh;
      } finally {
        this.inFlight.delete(key);
        if (this.client) {
          try {
            await this.client.del(lockKey);
          } catch {
            // Ignore lock cleanup errors
          }
        }
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }
}
