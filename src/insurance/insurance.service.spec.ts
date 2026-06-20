import { InsuranceService } from './insurance.service';
import { PricingService } from './pricing.service';
import { PoolService } from './pool.service';
import { RiskType } from './enums/risk-type.enum';
import { BadRequestException } from '@nestjs/common';

describe('InsuranceService', () => {
  let service: InsuranceService;
  let pricing: PricingService;
  let pools: PoolService;
  let prisma: any;
  let auditService: any;

  const buildMockTx = (createdPolicy: any = { id: 'policy-1' }) => ({
    insurancePolicy: { create: jest.fn().mockResolvedValue(createdPolicy) },
    insurancePool: { findUnique: jest.fn(), update: jest.fn() },
  });

  beforeEach(() => {
    pricing = { calculatePremium: jest.fn() } as any;
    pools = { lockCapital: jest.fn() } as any;

    const mockTx = buildMockTx();

    prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn(mockTx)),
    };

    auditService = {
      log: jest.fn(),
    };

    service = new InsuranceService(pricing, pools, prisma, auditService);
    jest.clearAllMocks();
  });

  describe('purchasePolicy', () => {
    it('should throw BadRequestException if userId is missing', async () => {
      await expect(service.purchasePolicy('', 'pool-1', RiskType.PROJECT_FAILURE, 1000))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if poolId is missing', async () => {
      await expect(service.purchasePolicy('user-1', '', RiskType.PROJECT_FAILURE, 1000))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coverageAmount is not positive', async () => {
      await expect(service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 0))
        .rejects.toThrow(BadRequestException);
      await expect(service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, -100))
        .rejects.toThrow(BadRequestException);
    });

    it('should successfully purchase a policy', async () => {
      (pricing.calculatePremium as jest.Mock).mockReturnValue(500);
      (pools.lockCapital as jest.Mock).mockResolvedValue(undefined);

      const mockTx = buildMockTx({ id: 'policy-1', userId: 'user-1', poolId: 'pool-1' });
      prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

      const result = await service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 10000);

      expect(pricing.calculatePremium).toHaveBeenCalledWith(RiskType.PROJECT_FAILURE, 10000);
      expect(pools.lockCapital).toHaveBeenCalledWith('pool-1', 10000, mockTx);
      expect(mockTx.insurancePolicy.create).toHaveBeenCalled();
      expect(result.id).toBe('policy-1');
    });

    it('should rollback transaction on error', async () => {
      (pricing.calculatePremium as jest.Mock).mockReturnValue(500);
      (pools.lockCapital as jest.Mock).mockRejectedValue(new Error('Pool capital insufficient'));

      prisma.$transaction.mockImplementation(async (fn) => fn(buildMockTx()));

      await expect(
        service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 10000),
      ).rejects.toThrow('Pool capital insufficient');
    });

    // Regression coverage for issue #399: coverageAmount/premium were previously
    // run through EncryptionService.encrypt() and then force-cast back to a
    // number via parseFloat(), which produced NaN/garbage instead of a valid
    // decimal. These tests assert the values written to the DB are the exact,
    // uncorrupted plain decimals expected by the numeric(18,2) columns.
    describe('valid DB payload (issue #399 regression)', () => {
      it('writes plain, unencrypted decimal values for coverageAmount and premium', async () => {
        (pricing.calculatePremium as jest.Mock).mockReturnValue(500);
        (pools.lockCapital as jest.Mock).mockResolvedValue(undefined);

        const mockTx = buildMockTx({ id: 'policy-1' });
        prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

        await service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 10000);

        expect(mockTx.insurancePolicy.create).toHaveBeenCalledWith({
          data: {
            userId: 'user-1',
            poolId: 'pool-1',
            riskType: RiskType.PROJECT_FAILURE,
            coverageAmount: 10000,
            premium: 500,
          },
        });
      });

      it('never produces NaN or non-finite values for coverageAmount/premium', async () => {
        (pricing.calculatePremium as jest.Mock).mockReturnValue(123.45);
        (pools.lockCapital as jest.Mock).mockResolvedValue(undefined);

        const mockTx = buildMockTx({ id: 'policy-1' });
        prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

        await service.purchasePolicy('user-1', 'pool-1', RiskType.SMART_CONTRACT_EXPLOIT, 9999.99);

        const writtenData = mockTx.insurancePolicy.create.mock.calls[0][0].data;
        expect(Number.isFinite(writtenData.coverageAmount)).toBe(true);
        expect(Number.isFinite(writtenData.premium)).toBe(true);
        expect(writtenData.coverageAmount).toBe(9999.99);
        expect(writtenData.premium).toBe(123.45);
      });

      it('does not depend on EncryptionService for numeric fields', () => {
        // InsuranceService no longer takes an EncryptionService dependency at
        // all: financial decimal fields are not encrypted at rest, since
        // claim assessment, fraud detection, and pool capital locking all
        // require direct numeric comparison/aggregation on these columns.
        expect(service['encryption']).toBeUndefined();
      });
    });
  });
});