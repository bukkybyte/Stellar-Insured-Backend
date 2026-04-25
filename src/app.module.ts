import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv } from './config/env.validation';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { NonceModule } from './nonce/nonce.module';         // ← NEW
import { ReputationModule } from './reputation/reputation.module';
import { DatabaseModule } from './database.module';
import { IndexerModule } from './indexer/indexer.module';
import { NotificationModule } from './notification/notification.module';
import { EncryptionModule } from './encryption/encryption.module';
import { StorageModule } from './storage/storage.module';
import { InsuranceModule } from './insurance/insurance.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

// ← NEW: global exception filter for standardised error responses
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.get<number>('THROTTLE_DEFAULT_TTL', 900000),
            limit: configService.get<number>('THROTTLE_DEFAULT_LIMIT', 100),
          },
          {
            name: 'auth',
            ttl: configService.get<number>('THROTTLE_AUTH_TTL', 900000),
            limit: configService.get<number>('THROTTLE_AUTH_LIMIT', 5),
          },
        ],
      }),
    }),

    TerminusModule,
    HttpModule,

    // Feature modules
    AuthModule,
    UserModule,
    NonceModule,           // ← NEW: nonce replay-prevention now wired in
    ReputationModule,
    DatabaseModule,
    IndexerModule,
    NotificationModule,
    EncryptionModule,
    StorageModule,
    CsrfModule,

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('THROTTLE_DEFAULT_TTL') || 900000,
          limit: config.get<number>('THROTTLE_DEFAULT_LIMIT') || 100,
        },
        {
          name: 'auth',
          ttl: config.get<number>('THROTTLE_AUTH_TTL') || 900000,
          limit: config.get<number>('THROTTLE_AUTH_LIMIT') || 5,
        },
        {
          name: 'public',
          ttl: config.get<number>('THROTTLE_PUBLIC_TTL') || 60000,
          limit: config.get<number>('THROTTLE_PUBLIC_LIMIT') || 50,
        },
        {
          name: 'admin',
          ttl: config.get<number>('THROTTLE_ADMIN_TTL') || 60000,
          limit: config.get<number>('THROTTLE_ADMIN_LIMIT') || 100,
        },
        {
          name: 'claims',
          ttl: config.get<number>('THROTTLE_CLAIMS_TTL') || 3600000,
          limit: config.get<number>('THROTTLE_CLAIMS_LIMIT') || 10,
        },
      ],
    }),
    InsuranceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global JWT guard — decorators like @Public() opt routes out.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    // Global exception filter — all thrown exceptions return ErrorResponseDto.
    // This replaces the four inconsistent error formats previously in the codebase.
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}