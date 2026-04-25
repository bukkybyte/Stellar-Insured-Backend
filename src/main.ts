import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as csurf from 'csurf';
import * as cookieParser from 'cookie-parser';
import { logger } from './config/winston.config';
import * as expressWinston from 'express-winston';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });
  const configService = app.get(ConfigService);

  // Application bootstrap setup
  // - create the Nest app with a shared Winston logger
  // - load config service for runtime configuration values
  // - apply middleware and global pipes before listening

  // Cookie parser for CSRF
  app.use(cookieParser());

  // Request logging
  app.use(expressWinston.logger({
    winstonInstance: logger,
    statusLevels: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    meta: true,
    msg: "HTTP {{req.method}} {{req.url}}",
    expressFormat: true,
    colorize: false,
  }));

  // CSRF protection
  app.use(csurf({
    cookie: {
      httpOnly: true,
      secure: configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  }));

  // Global validation pipe
  // - removes non-whitelisted properties
  // - rejects unrecognized payload fields
  // - keeps runtime types safe by avoiding implicit conversion
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // API prefix - version is now handled by NestJS versioning
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Enable URI-based API versioning (e.g. /api/v1/users, /api/v2/users)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // CORS
  app.enableCors();

  // Enable NestJS shutdown hooks so lifecycle events (onModuleDestroy, etc.) fire on SIGTERM/SIGINT
  app.enableShutdownHooks();

  const requestTimeoutMs = configService.get<number>('REQUEST_TIMEOUT_MS', 30000);
  const keepAliveTimeoutMs = configService.get<number>('KEEP_ALIVE_TIMEOUT_MS', 5000);

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(requestTimeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request Timeout',
          message: `Request exceeded ${requestTimeoutMs / 1000} second limit`,
        });
      }
    });
    next();
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  const server = app.getHttpServer() as any;
  if (typeof server?.setTimeout === 'function') {
    server.setTimeout(requestTimeoutMs);
  }
  server.keepAliveTimeout = keepAliveTimeoutMs;
  server.headersTimeout = requestTimeoutMs + 10000;

  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);

  // Graceful shutdown handling
  // Ensures the server stops accepting new requests, closes the HTTP server,
  // and allows Nest lifecycle hooks to fire before exiting.
  const shutdownTimeout = configService.get<number>('SHUTDOWN_TIMEOUT', 30000);
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.log(`${signal} received. Starting graceful shutdown...`);

    const forceExitTimer = setTimeout(() => {
      logger.error('Forced shutdown after timeout — could not complete gracefully');
      process.exit(1);
    }, shutdownTimeout);

    try {
      // Stop accepting new connections
      const server = app.getHttpServer();
      server.close(() => {
        logger.log('HTTP server closed — no longer accepting requests');
      });

      // Close the NestJS app (triggers onModuleDestroy, onApplicationShutdown hooks)
      await app.close();

      clearTimeout(forceExitTimer);
      logger.log('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during graceful shutdown: ${error.message}`);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap();
