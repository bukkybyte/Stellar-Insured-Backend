import { Injectable } from '@nestjs/common';
import { ReinsuranceContract } from './entities/reinsurance-contract.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditService } from './services/audit.service';

@Injectable()
export class ReinsuranceService {
  constructor(
    @InjectRepository(ReinsuranceContract) private readonly repo: Repository<ReinsuranceContract>,
    private readonly auditService: AuditService,
  ) {}

  async createContract(poolId: string, coverageLimit: number, premiumRate: number) {
    const contract = this.repo.create({ poolId, coverageLimit, premiumRate });
    const savedContract = await this.repo.save(contract);
    await this.auditService.logCreate('ReinsuranceContract', savedContract.id, savedContract);
    return savedContract;
  }
}
