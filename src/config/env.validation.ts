import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  IsUrl,
  MinLength,
  Matches,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  API_PREFIX: string;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  /**
   * Fixed: was DATABASE_USER — now matches .env.example which uses DATABASE_USERNAME.
   * If you prefer DATABASE_USER everywhere, update .env.example instead.
   */
  @IsString()
  DATABASE_USERNAME: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  @IsOptional()
  DATABASE_LOGGING: string = 'error,warn';

  @IsNumber()
  @IsOptional()
  DATABASE_MAX_QUERY_EXECUTION_TIME: number = 1000;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL_ENABLED: boolean = false;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL_REJECT_UNAUTHORIZED: boolean = false;

  // Redis Configuration
  @IsUrl({ protocols: ['redis', 'rediss'] })
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  /**
   * JWT_SECRET must be:
   *  - at least 32 characters long
   *  - not a known placeholder value
   *  - contain at least one uppercase, one lowercase, one digit, and one special char
   *    (enforced via Matches — relaxed in development via custom logic below)
   *
   * Minimum complexity is checked inside validateEnv() to allow environment-specific rules.
   */
  @IsString()
  @MinLength(32, {
    message:
      'JWT_SECRET must be at least 32 characters long. Generate one with: openssl rand -base64 48',
  })
  JWT_SECRET: string;

  /**
   * JWT_REFRESH_SECRET shares the same strength requirements as JWT_SECRET.
   */
  @IsString()
  @MinLength(32, {
    message:
      'JWT_REFRESH_SECRET must be at least 32 characters long. Generate one with: openssl rand -base64 48',
  })
  @IsOptional()
  JWT_REFRESH_SECRET: string;

  @IsNumber()
  JWT_EXPIRATION: number;

  @IsString()
  STELLAR_NETWORK: string;

  @IsString()
  STELLAR_RPC_URL: string;

  @IsString()
  STELLAR_NETWORK_PASSPHRASE: string;

  @IsString()
  PROJECT_LAUNCH_CONTRACT_ID: string;

  @IsString()
  ESCROW_CONTRACT_ID: string;

  @IsNumber()
  INDEXER_POLL_INTERVAL_MS: number;

  @IsNumber()
  @IsOptional()
  THROTTLE_DEFAULT_LIMIT: number = 100;

  @IsNumber()
  @IsOptional()
  THROTTLE_AUTH_TTL: number = 900000;

  @IsNumber()
  @IsOptional()
  THROTTLE_AUTH_LIMIT: number = 5;

  @IsBoolean()
  @IsOptional()
  RATE_LIMIT_REDIS_ENABLED: boolean = false;

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';
}

/** Placeholder values that must never be used in production. */
const WEAK_JWT_PLACEHOLDERS = [
  'your-jwt-secret-key-change-in-production',
  'your-refresh-secret-key-change-in-production',
  'secret',
  'changeme',
  'password',
];

function assertJwtStrength(
  value: string,
  fieldName: string,
  env: Environment,
): void {
  const lower = value.toLowerCase();

  if (WEAK_JWT_PLACEHOLDERS.some((p) => lower.includes(p))) {
    throw new Error(
      `${fieldName} contains a placeholder value. ` +
        `Replace it with a strong random secret: openssl rand -base64 48`,
    );
  }

  if (env === Environment.Production) {
    // In production, enforce character-class complexity.
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      throw new Error(
        `${fieldName} does not meet production complexity requirements. ` +
          `It must contain uppercase, lowercase, digit, and special characters. ` +
          `Generate one with: openssl rand -base64 48`,
      );
    }
  }
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  // Additional JWT secret strength checks that go beyond simple decorator rules.
  assertJwtStrength(
    validatedConfig.JWT_SECRET,
    'JWT_SECRET',
    validatedConfig.NODE_ENV,
  );

  if (validatedConfig.JWT_REFRESH_SECRET) {
    assertJwtStrength(
      validatedConfig.JWT_REFRESH_SECRET,
      'JWT_REFRESH_SECRET',
      validatedConfig.NODE_ENV,
    );
  }

  return validatedConfig;
}