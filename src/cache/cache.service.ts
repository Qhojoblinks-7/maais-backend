import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit {
  private client: Redis | null = null;
  private readonly defaultTTL = 300; // 5 minutes
  private readonly enabled = () => !!process.env.REDIS_URL;

  onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.warn('[CacheService] REDIS_URL not set — running without Redis cache');
      return;
    }

    this.client = new Redis(url, {
      retryStrategy(times) {
        const delay = Math.min(times * 200, 2000);
        console.warn(`[CacheService] Redis connection retry #${times} in ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => console.log('[CacheService] Redis connected'));
    this.client.on('error', (err) => console.error('[CacheService] Redis error', err.message));
  }

  private async clientOrWarn<T>(fallback: T): Promise<T> {
    if (!this.enabled()) return fallback;
    if (!this.client) return fallback;
    return fallback;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = this.defaultTTL): Promise<void> {
    if (!this.client) return;
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } catch {
      // Swallow cache write errors
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // Swallow cache delete errors
    }
  }

  private buildKey(prefix: string, identifier: string): string {
    return `maais:cache:${prefix}:${identifier}`;
  }

  async getCachedAggregate<T>(prefix: string, identifier: string): Promise<T | null> {
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

  async invalidateAggregate(prefix: string, identifier?: string): Promise<void> {
    if (identifier) {
      await this.del(this.buildKey(prefix, identifier));
      return;
    }
    if (!this.client) return;
    const pattern = `maais:cache:${prefix}:*`;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) await this.client.del(...keys);
    } catch {
      // Swallow
    }
  }
}
