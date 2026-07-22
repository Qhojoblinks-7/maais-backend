import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ResponseCompressionMiddleware } from './common/middleware/response-compression.middleware';
import { QueryProfilingMiddleware } from './common/middleware/query-profiling.middleware';
import { RateLimitingMiddleware } from './common/middleware/rate-limiting.middleware';

function requestTimingMiddleware(req: any, res: any, next: () => void) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > 2000) {
      // eslint-disable-next-line no-console
      console.warn(`[PERF] ${req.method} ${req.originalUrl} took ${ms}ms`);
    }
  });
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Compression (zero-dep, zlib) + slow-request timing for all roles.
  app.use(new QueryProfilingMiddleware().use);
  app.use(requestTimingMiddleware);
  app.use(new RateLimitingMiddleware().use);
  app.use(new ResponseCompressionMiddleware().use);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  const isKnownOrigin = (origin) => {
    if (!origin) return false;
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:4173',
      'http://localhost:3000',
      'https://maais-academic-audit-system.vercel.app',
    ].filter(Boolean);
    if (allowed.includes(origin)) return true;
    try {
      if (/^https:\/\/maais-academic-audit-system(?:-[\w-]+)?\.vercel\.app$/.test(new URL(origin).hostname)) return true;
    } catch {
      return false;
    }
    return false;
  };

  app.enableCors({
    origin: (origin) => (isKnownOrigin(origin) ? origin : false),
    credentials: true,
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('MAAIS API')
    .setDescription('Mando SHTS Academic Audit & Intervention System')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & session management')
    .addTag('Users', 'User & profile management')
    .addTag('Academic Architect', 'Years, terms, subjects, classes')
    .addTag('Grading', 'Score entry, audit, smart remarks')
    .addTag('Reports', 'Report cards & transcripts')
    .addTag('Archive', 'The Vault & promotion cycle')
    .addTag('Comms', 'Notifications & communications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = Number(process.env.PORT) || 3000;
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  await app.listen(port);
  console.log(`🏫 MAAIS API running on ${appUrl}/api/v1`);
  console.log(`📖 Swagger docs: ${appUrl}/api/docs`);
}
bootstrap();
