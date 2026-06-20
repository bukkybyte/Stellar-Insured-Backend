import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from './services/audit.service';

@Injectable()
export class ReinsuranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createContract(poolId: string, coverageLimit: number, premiumRate: number) {
    const savedContract = await this.prisma.reinsuranceContract.create({
      data: { poolId, coverageLimit, premiumRate },
    });
    await this.auditService.logCreate('ReinsuranceContract', savedContract.id, savedContract);
    return savedContract;
  }
}
