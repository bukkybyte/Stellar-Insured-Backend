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
  let encryption: any;
  let auditService: any;

  beforeEach(() => {
    pricing = { calculatePremium: jest.fn() } as any;
    pools = { lockCapital: jest.fn() } as any;

    const mockCreatedPolicy = { id: 'policy-1' };
    const mockTx = {
      insurancePolicy: { create: jest.fn().mockResolvedValue(mockCreatedPolicy) },
      insurancePool: { findUnique: jest.fn(), update: jest.fn() },
    };

    prisma = {
      $transaction: jest.fn().mockImplementation(async (fn) => fn(mockTx)),
      insurancePolicy: { create: jest.fn().mockResolvedValue(mockCreatedPolicy) },
    };

    encryption = {
      encrypt: jest.fn((val: string) => `enc:${val}`),
    };

    auditService = {
      log: jest.fn(),
    };

    service = new InsuranceService(pricing, pools, prisma, encryption, auditService);
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

      const mockTx = {
        insurancePolicy: {
          create: jest.fn().mockResolvedValue({ id: 'policy-1', userId: 'user-1', poolId: 'pool-1' }),
        },
        insurancePool: { findUnique: jest.fn(), update: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

      const result = await service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 10000);

      expect(pricing.calculatePremium).toHaveBeenCalledWith(RiskType.PROJECT_FAILURE, 10000);
      expect(pools.lockCapital).toHaveBeenCalledWith('pool-1', 10000, mockTx);
      expect(encryption.encrypt).toHaveBeenCalledWith('10000');
      expect(encryption.encrypt).toHaveBeenCalledWith('500');
      expect(mockTx.insurancePolicy.create).toHaveBeenCalled();
      expect(result.id).toBe('policy-1');
    });

    it('should rollback transaction on error', async () => {
      (pricing.calculatePremium as jest.Mock).mockReturnValue(500);
      (pools.lockCapital as jest.Mock).mockRejectedValue(new Error('Pool capital insufficient'));

      prisma.$transaction.mockImplementation(async (fn) => {
        const mockTx = {
          insurancePolicy: { create: jest.fn() },
          insurancePool: { findUnique: jest.fn(), update: jest.fn() },
        };
        return fn(mockTx);
      });

      await expect(
        service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 10000),
      ).rejects.toThrow('Pool capital insufficient');
    });

    it('should encrypt coverage amount and premium before saving', async () => {
      (pricing.calculatePremium as jest.Mock).mockReturnValue(300);
      (pools.lockCapital as jest.Mock).mockResolvedValue(undefined);

      const mockTx = {
        insurancePolicy: { create: jest.fn().mockResolvedValue({ id: 'p' }) },
        insurancePool: { findUnique: jest.fn(), update: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

      await service.purchasePolicy('user-1', 'pool-1', RiskType.MARKET_VOLATILITY, 10000);

      expect(encryption.encrypt).toHaveBeenCalledTimes(2);
      expect(encryption.encrypt).toHaveBeenCalledWith('10000');
      expect(encryption.encrypt).toHaveBeenCalledWith('300');
    });
  });
});
