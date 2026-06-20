import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PoolService } from './pool.service';
import { RiskType } from './enums/risk-type.enum';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AuditService } from './services/audit.service';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    private readonly pricing: PricingService,
    private readonly pools: PoolService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async purchasePolicy(userId: string, poolId: string, riskType: RiskType, coverageAmount: number) {
    if (!userId || !poolId) {
      throw new BadRequestException('userId and poolId are required');
    }
    if (coverageAmount <= 0) {
      throw new BadRequestException('Coverage amount must be positive');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const premium = this.pricing.calculatePremium(riskType, coverageAmount);

        await this.pools.lockCapital(poolId, coverageAmount, tx);

        return tx.insurancePolicy.create({
          data: {
            userId,
            poolId,
            riskType,
            coverageAmount: parseFloat(this.encryption.encrypt(coverageAmount.toString())),
            premium: parseFloat(this.encryption.encrypt(premium.toString())),
          },
        });
      });
    } catch (error) {
      this.logger.error(`Purchase policy failed for user ${userId}, pool ${poolId}: ${error.message}`);
      throw error;
    }
  }
}
