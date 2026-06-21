import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './http-exception.filter';
import { ErrorCode } from '../enums/error-codes.enum';

interface MockResponse {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<void, [unknown]>;
}

function createPrismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Prisma request failed', {
    code,
    clientVersion: '5.19.0',
  });
}

function createArgumentsHost(response: MockResponse): ArgumentsHost {
  const request = {
    method: 'POST',
    url: '/policies',
    headers: {
      'x-request-id': 'req-1',
    },
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
      getNext: () => undefined,
    }),
    getArgByIndex: () => undefined,
    getArgs: () => [],
    getType: () => 'http',
    switchToRpc: () => ({
      getContext: () => undefined,
      getData: () => undefined,
    }),
    switchToWs: () => ({
      getClient: () => undefined,
      getData: () => undefined,
      getPattern: () => undefined,
    }),
  };

  return host as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let response: MockResponse;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['P2002', HttpStatus.CONFLICT, ErrorCode.CONFLICT],
    ['P2003', HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.UNPROCESSABLE_ENTITY],
    ['P2011', HttpStatus.BAD_REQUEST, ErrorCode.BAD_REQUEST],
    ['P2025', HttpStatus.NOT_FOUND, ErrorCode.NOT_FOUND],
  ])(
    'translates Prisma %s to an API error response',
    (prismaCode, status, errorCode) => {
      filter.catch(
        createPrismaError(prismaCode),
        createArgumentsHost(response),
      );

      expect(response.status).toHaveBeenCalledWith(status);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: errorCode,
            path: '/policies',
            requestId: 'req-1',
          }),
        }),
      );
    },
  );

  it('falls back to a generic database error for unknown Prisma codes', () => {
    filter.catch(createPrismaError('P2999'), createArgumentsHost(response));

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred.',
        }),
      }),
    );
  });
});
