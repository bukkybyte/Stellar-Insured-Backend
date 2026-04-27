import { InsuranceService } from './insurance.service';
import { PricingService } from './pricing.service';
import { PoolService } from './pool.service';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { RiskType } from './enums/risk-type.enum';
import { BadRequestException } from '@nestjs/common';

describe('InsuranceService', () => {
  let service: InsuranceService;
  let pricing: PricingService;
  let pools: PoolService;
  let repo: any;
  let encryption: any;
  let auditService: any;
  let queryRunner: any;

  beforeEach(() => {
    pricing = { calculatePremium: jest.fn() } as any;
    pools = { lockCapital: jest.fn() } as any;

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
      },
    };

    repo = {
      create: jest.fn(),
      manager: {
        connection: {
          createQueryRunner: jest.fn().mockReturnValue(queryRunner),
        },
      },
    };

    encryption = {
      encrypt: jest.fn((val: string) => `enc:${val}`),
    };

    auditService = {
      log: jest.fn(),
    };

    service = new InsuranceService(pricing, pools, repo, encryption, auditService);
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

      const policyData = {
        userId: 'user-1',
        poolId: 'pool-1',
        riskType: RiskType.PROJECT_FAILURE,
        coverageAmount: expect.any(Number),
        premium: expect.any(Number),
      };

      repo.create.mockReturnValue({ id: 'policy-1', ...policyData });
      queryRunner.manager.save.mockResolvedValue({ id: 'policy-1', ...policyData });

      const result = await service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 10000);

      expect(pricing.calculatePremium).toHaveBeenCalledWith(RiskType.PROJECT_FAILURE, 10000);
      expect(pools.lockCapital).toHaveBeenCalledWith('pool-1', 10000, queryRunner);
      expect(encryption.encrypt).toHaveBeenCalledWith('10000'); // coverageAmount
      expect(encryption.encrypt).toHaveBeenCalledWith('500'); // premium
      expect(repo.create).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      (pricing.calculatePremium as jest.Mock).mockReturnValue(500);
      (pools.lockCapital as jest.Mock).mockRejectedValue(new Error('Pool capital insufficient'));

      await expect(
        service.purchasePolicy('user-1', 'pool-1', RiskType.PROJECT_FAILURE, 10000),
      ).rejects.toThrow('Pool capital insufficient');

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should always release queryRunner in finally block', async () => {
      (pricing.calculatePremium as jest.Mock).mockReturnValue(500);
      (pools.lockCapital as jest.Mock).mockResolvedValue(undefined);
      queryRunner.manager.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.purchasePolicy('user-1', 'pool-1', RiskType.MARKET_VOLATILITY, 5000),
      ).rejects.toThrow();

      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should encrypt coverage amount and premium before saving', async () => {
      (pricing.calculatePremium as jest.Mock).mockReturnValue(300);
      (pools.lockCapital as jest.Mock).mockResolvedValue(undefined);

      repo.create.mockImplementation((data) => data);
      queryRunner.manager.save.mockImplementation(async (p) => ({ id: 'new-policy', ...p }));

      await service.purchasePolicy('user-1', 'pool-1', RiskType.MARKET_VOLATILITY, 10000);

      expect(encryption.encrypt).toHaveBeenCalledTimes(2);
      expect(encryption.encrypt).toHaveBeenCalledWith('10000');
      expect(encryption.encrypt).toHaveBeenCalledWith('300');
    });
  });
});
