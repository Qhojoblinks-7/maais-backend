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
      console.warn(`[PERF] ${req.method} ${req.originalUrl} took ${ms}ms`);
    }
  });
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.use(new QueryProfilingMiddleware().use);
  app.use(requestTimingMiddleware);
  app.use(new RateLimitingMiddleware().use);
  app.use(new ResponseCompressionMiddleware().use);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:4173',
      'http://localhost:3000',
      'https://maais-academic-audit-system.vercel.app',
    ].filter(Boolean),
    credentials: true,
  });

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

  const port = process.env.PORT || 3000;
  const appUrl = process.env.APP_URL || `http://localhost:${port}`;
  await app.listen(port);
  console.log(`🏫 MAAIS API running on ${appUrl}/api/v1`);
  console.log(`📖 Swagger docs: ${appUrl}/api/docs`);
}
bootstrap();
