import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class QueryProfilingMiddleware implements NestMiddleware {
  private static readonly SLOW_THRESHOLD = 1000; // 1s
  private static readonly VERY_SLOW_THRESHOLD = 5000; // 5s

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const originalSend = res.send.bind(res);

    res.send = (body: unknown) => {
      const duration = Date.now() - start;
      if (duration > QueryProfilingMiddleware.VERY_SLOW_THRESHOLD) {
        console.error(
          `[QUERY_PROF] VERY SLOW ${req.method} ${req.originalUrl} took ${duration}ms`,
        );
      } else if (duration > QueryProfilingMiddleware.SLOW_THRESHOLD) {
        console.warn(
          `[QUERY_PROF] SLOW ${req.method} ${req.originalUrl} took ${duration}ms`,
        );
      }
      return originalSend(body);
    };

    next();
  }
}
