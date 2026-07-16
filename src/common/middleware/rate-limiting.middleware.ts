import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const WINDOW = 60_000;
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '1000', 10);

@Injectable()
export class RateLimitingMiddleware implements NestMiddleware {
  private readonly requests = new Map<string, RateLimitEntry>();

  use = (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = this.requests.get(key);

    if (entry && now > entry.resetTime) {
      this.requests.delete(key);
    }

    const current = this.requests.get(key);
    if (current && current.count >= MAX_REQUESTS) {
      res.setHeader('Retry-After', Math.ceil((current.resetTime - now) / 1000));
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests, please try again later.',
      });
      return;
    }

    if (!current) {
      this.requests.set(key, { count: 1, resetTime: now + WINDOW });
    } else {
      current.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, MAX_REQUESTS - (current?.count || 1)).toString(),
    );

    next();
  };
}
