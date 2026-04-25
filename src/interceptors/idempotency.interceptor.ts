import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const idempotencyKey = request.headers['idempotency-key'] || request.headers['Idempotency-Key'];

    // If no idempotency key, proceed normally
    if (!idempotencyKey) {
      return next.handle();
    }

    const method = request.method;
    const endpoint = request.url;

    try {
      // Check if key already exists and is still valid
      const existingKey = await this.prisma.idempotencyKey.findUnique({
        where: { key: idempotencyKey },
      });

      if (existingKey) {
        // Check if key has expired
        if (new Date() > existingKey.expiresAt) {
          // Key expired, delete it and allow request to proceed
          await this.prisma.idempotencyKey.delete({
            where: { key: idempotencyKey },
          });
        } else if (existingKey.status === 'COMPLETED' && existingKey.response) {
          // Return cached response
          response.set('X-Idempotency-Key', idempotencyKey);
          response.set('X-Idempotency-Replayed', 'true');
          return of(existingKey.response);
        } else if (existingKey.status === 'PENDING') {
          // Request is being processed, return 409 Conflict
          throw new HttpException(
            'Request is still being processed. Please wait and retry.',
            HttpStatus.CONFLICT,
          );
        }
      }

      // Create new idempotency key record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour TTL

      await this.prisma.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          method,
          endpoint,
          requestBody: request.body || {},
          status: 'PENDING',
          expiresAt,
        },
      });

      // Process the request
      return next.handle().pipe(
        tap(async (result) => {
          // Store successful response
          await this.prisma.idempotencyKey.update({
            where: { key: idempotencyKey },
            data: {
              status: 'COMPLETED',
              response: result,
            },
          });
          response.set('X-Idempotency-Key', idempotencyKey);
        }),
      );
    } catch (error) {
      // If it's an HttpException, re-throw it
      if (error instanceof HttpException) {
        throw error;
      }

      // For other errors, update idempotency key status if it exists
      if (idempotencyKey) {
        try {
          await this.prisma.idempotencyKey.update({
            where: { key: idempotencyKey },
            data: {
              status: 'FAILED',
              response: { error: error.message || 'Internal server error' },
            },
          });
        } catch (dbError) {
          // Ignore database errors during error handling
        }
      }
      throw error;
    }
  }
}
