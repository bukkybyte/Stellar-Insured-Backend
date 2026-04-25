import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaService } from '../prisma.service';

import { InsurancePolicy } from './entities/insurance-policy.entity';
import { InsurancePool } from './entities/insurance-pool.entity';
import { Claim } from './entities/claim.entity';
import { ReinsuranceContract } from './entities/reinsurance-contract.entity';
import { AuditLog } from './entities/audit-log.entity';

import { InsuranceController } from './insurance.controller';

import { InsuranceService } from './insurance.service';
import { PoolService } from './pool.service';
import { ClaimService } from './claim.service';
import { ReinsuranceService } from './reinsurance.service';
import { PricingService } from './pricing.service';
import { AuditService } from './services/audit.service';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InsurancePolicy,
      InsurancePool,
      Claim,
      ReinsuranceContract,
      AuditLog,
    ]),
  ],
  controllers: [InsuranceController],
  providers: [
    InsuranceService,
    PoolService,
    ClaimService,
    ReinsuranceService,
    PricingService,
    AuditService,
    PrismaService,
    IdempotencyInterceptor,
  ],
  exports: [
    InsuranceService,
    PoolService,
    ClaimService,
    ReinsuranceService,
    PricingService,
    AuditService,
    PrismaService,
  ],
})
export class InsuranceModule {}
