import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InsurancePool } from './entities/insurance-pool.entity';
import { Repository, QueryRunner } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditService } from './services/audit.service';

@Injectable()
export class PoolService {
  constructor(
    @InjectRepository(InsurancePool) private readonly repo: Repository<InsurancePool>,
    private readonly auditService: AuditService,
  ) {}

  async addCapital(poolId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const pool = await this.repo.findOne({ where: { id: poolId } });
    if (!pool) {
      throw new NotFoundException(`Pool ${poolId} not found`);
    }
    const beforeState = { ...pool };
    pool.capital = Number(pool.capital) + amount;
    const updatedPool = await this.repo.save(pool);
    await this.auditService.logAddCapital('InsurancePool', poolId, beforeState, updatedPool);
    return updatedPool;
  }

  async lockCapital(poolId: string, amount: number, queryRunner?: QueryRunner) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const manager = queryRunner?.manager || this.repo.manager;
    const pool = await manager.findOne(InsurancePool, { where: { id: poolId } });
    if (!pool) {
      throw new NotFoundException(`Pool ${poolId} not found`);
    }
    const beforeState = { ...pool };
    pool.lockedCapital = Number(pool.lockedCapital) + amount;
    return manager.save(pool);
    const updatedPool = await this.repo.save(pool);
    await this.auditService.logUpdate('InsurancePool', poolId, beforeState, updatedPool);
    return updatedPool;
  }
}
