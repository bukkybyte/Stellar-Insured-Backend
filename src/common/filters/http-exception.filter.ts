import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ThrottlerException } from '@nestjs/throttler';
import { ErrorCode } from '../enums/error-codes.enum';
import {
  ErrorResponseDto,
  ValidationFieldError,
} from '../dto/error-response.dto';

/**
 * AllExceptionsFilter
 *
 * Global exception filter — catches **every** thrown exception and converts it
 * into the standardised ErrorResponseDto shape so clients always receive:
 *
 *   { success: false, error: { code, message, details, timestamp, path, requestId } }
 *
 * Previously the codebase had four different error shapes:
 *  1. { error: 'message' }   — returned with HTTP 200
 *  2. NestJS default          — { statusCode, message, error }
 *  3. Unhandled exception     — { message, statusCode: 500 }
 *  4. throw new Error(...)    — { message, statusCode: 500 }
 *
 * This filter replaces all four with a single, predictable contract.
 *
 * Register it globally in AppModule:
 *   { provide: APP_FILTER, useClass: AllExceptionsFilter }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } =
      this.extractErrorInfo(exception);

    // Pull correlation ID injected by CorrelationIdMiddleware (if present).
    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-correlation-id'] as string) ||
      undefined;

    const body: ErrorResponseDto = {
      success: false,
      error: {
        code,
        message,
        details: details ?? null,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    };

    // Log server errors (5xx) at error level; client errors (4xx) at warn.
    if (status >= 500) {
      this.logger.error(
        `[${requestId ?? '-'}] ${request.method} ${request.url} → ${status} ${code}: ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${requestId ?? '-'}] ${request.method} ${request.url} → ${status} ${code}: ${message}`,
      );
    }

    response.status(status).json(body);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private extractErrorInfo(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: ValidationFieldError[] | Record<string, unknown> | null;
  } {
    // 1. NestJS ThrottlerException
    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many requests. Please slow down and try again later.',
      };
    }

    // 2. Standard NestJS HttpException (covers NotFoundException, BadRequestException, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // class-validator pipe errors arrive as an object with a `message` array.
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse &&
        Array.isArray((exceptionResponse as any).message)
      ) {
        const validationDetails = this.parseClassValidatorErrors(
          (exceptionResponse as any).message,
        );
        return {
          status,
          code: ErrorCode.VALIDATION_ERROR,
          message: 'One or more input fields are invalid.',
          details: validationDetails,
        };
      }

      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message ?? exception.message;

      return {
        status,
        code: this.httpStatusToErrorCode(status),
        message,
      };
    }

    // 3. TypeORM constraint violations (e.g. unique key, not-null)
    if (exception instanceof QueryFailedError) {
      const pgCode = (exception as any).code as string | undefined;

      if (pgCode === '23505') {
        // unique_violation
        return {
          status: HttpStatus.CONFLICT,
          code: ErrorCode.CONFLICT,
          message: 'A record with the provided data already exists.',
        };
      }

      if (pgCode === '23503') {
        // foreign_key_violation
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ErrorCode.UNPROCESSABLE_ENTITY,
          message: 'The referenced resource does not exist.',
        };
      }

      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'A database error occurred.',
      };
    }

    // 4. Generic / unknown exceptions
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  /**
   * Convert an array of class-validator error strings into structured
   * ValidationFieldError objects.
   *
   * class-validator messages typically look like:
   *   "walletAddress must be a string"
   *   "email must be an email"
   */
  private parseClassValidatorErrors(
    messages: string[],
  ): ValidationFieldError[] {
    const fieldMap = new Map<string, string[]>();

    for (const msg of messages) {
      // Best-effort: split on first space — everything before is the field name.
      const spaceIdx = msg.indexOf(' ');
      const field = spaceIdx > -1 ? msg.substring(0, spaceIdx) : 'unknown';
      const constraint = msg;

      if (!fieldMap.has(field)) fieldMap.set(field, []);
      fieldMap.get(field)!.push(constraint);
    }

    return Array.from(fieldMap.entries()).map(([field, constraints]) => ({
      field,
      constraints,
    }));
  }

  private httpStatusToErrorCode(status: number): ErrorCode {
    const map: Record<number, ErrorCode> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UNPROCESSABLE_ENTITY,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
    };
    return map[status] ?? ErrorCode.INTERNAL_SERVER_ERROR;
  }
}