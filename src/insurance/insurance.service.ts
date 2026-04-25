import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PoolService } from './pool.service';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RiskType } from './enums/risk-type.enum';
import { EncryptionService } from '../encryption/encryption.service';
import { AuditService } from './services/audit.service';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    private readonly pricing: PricingService,
    private readonly pools: PoolService,
    @InjectRepository(InsurancePolicy) private readonly repo: Repository<InsurancePolicy>,
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

    const queryRunner = this.repo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const premium = this.pricing.calculatePremium(riskType, coverageAmount);

      await this.pools.lockCapital(poolId, coverageAmount, queryRunner);

      // Encrypt sensitive financial data before saving
      const policy = this.repo.create({
        userId,
        poolId,
        riskType,
        coverageAmount: parseFloat(this.encryption.encrypt(coverageAmount.toString())),
        premium: parseFloat(this.encryption.encrypt(premium.toString())),
      });

      const savedPolicy = await queryRunner.manager.save(policy);
      await queryRunner.commitTransaction();
      return savedPolicy;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Purchase policy failed for user ${userId}, pool ${poolId}: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
