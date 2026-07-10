import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { brotliCompressSync, gzipSync } from 'zlib';

/**
 * Zero-dependency response compression middleware using Node's built-in zlib.
 *
 * Compresses idempotent GET/HEAD responses when the client advertises support
 * via `Accept-Encoding`. This shrinks JSON payloads over poor/2G networks so
 * the UI receives data well within the 2–5s response budget. Mirrors the
 * `compression` package behaviour without an extra dependency (the npm install
 * chain for `compression` was previously unreliable in this environment).
 */
@Injectable()
export class ResponseCompressionMiddleware implements NestMiddleware {
  private static readonly MIN_SIZE = 512;

  use(req: Request, res: Response, next: NextFunction) {
    const accept = String(req.headers['accept-encoding'] || '');
    const method = (req.method || '').toUpperCase();

    if (
      req.headers['x-no-compression'] ||
      (method !== 'GET' && method !== 'HEAD')
    ) {
      return next();
    }

    let compress: ((buf: Buffer) => Buffer) | null = null;
    let encoding: string | null = null;

    if (accept.includes('br')) {
      compress = (b) => brotliCompressSync(b);
      encoding = 'br';
    } else if (accept.includes('gzip')) {
      compress = (b) => gzipSync(b);
      encoding = 'gzip';
    }

    if (!compress) return next();

    const originalSend = res.send.bind(res);

    res.send = (body: unknown) => {
      if (body == null) return originalSend(body);

      const buf: Buffer = Buffer.isBuffer(body)
        ? body
        : typeof body === 'string'
          ? Buffer.from(body)
          : Buffer.from(JSON.stringify(body));

      if (buf.length < ResponseCompressionMiddleware.MIN_SIZE) {
        return originalSend(body);
      }

      try {
        const compressed = compress(buf);
        res.removeHeader('Content-Length');
        res.setHeader('Content-Encoding', encoding as string);
        res.setHeader('Content-Length', compressed.length);
        res.end(compressed);
        return res;
      } catch {
        return originalSend(body);
      }
    };

    next();
  }
}
