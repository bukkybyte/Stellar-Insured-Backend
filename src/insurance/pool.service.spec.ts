import { PoolService } from './pool.service';
import { InsurancePool } from './entities/insurance-pool.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PoolService', () => {
  let service: PoolService;
  let repo: any;
  let auditService: any;

  const mockPool: Partial<InsurancePool> = {
    id: 'pool-1',
    name: 'Test Pool',
    capital: 10000,
    lockedCapital: 2000,
    createdAt: new Date(),
  };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
    };

    auditService = {
      logAddCapital: jest.fn(),
      logUpdate: jest.fn(),
    };

    service = new PoolService(repo, auditService);
    jest.clearAllMocks();
  });

  describe('addCapital', () => {
    it('should throw BadRequestException if amount is not positive', async () => {
      await expect(service.addCapital('pool-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.addCapital('pool-1', -100)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if pool is not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.addCapital('nonexistent', 500)).rejects.toThrow(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'nonexistent' } });
    });

    it('should add capital to an existing pool', async () => {
      const pool = { ...mockPool };
      repo.findOne.mockResolvedValue(pool);
      repo.save.mockImplementation(async (p) => p);

      const result = await service.addCapital('pool-1', 5000);

      expect(pool.capital).toBe(15000); // 10000 + 5000
      expect(repo.save).toHaveBeenCalledWith(pool);
      expect(result).toEqual(pool);
    });

    it('should call auditService.logAddCapital after adding capital', async () => {
      const pool = { ...mockPool };
      const beforeState = { ...pool };
      repo.findOne.mockResolvedValue(pool);
      repo.save.mockImplementation(async (p) => p);

      await service.addCapital('pool-1', 5000);

      expect(auditService.logAddCapital).toHaveBeenCalledWith(
        'InsurancePool',
        'pool-1',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('lockCapital', () => {
    it('should throw BadRequestException if amount is not positive', async () => {
      await expect(service.lockCapital('pool-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.lockCapital('pool-1', -50)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if pool is not found (without queryRunner)', async () => {
      repo.manager.findOne.mockResolvedValue(null);

      await expect(service.lockCapital('nonexistent', 1000)).rejects.toThrow(NotFoundException);
    });

    it('should lock capital without queryRunner using default manager', async () => {
      const pool = { ...mockPool };
      repo.manager.findOne.mockResolvedValue(pool);
      repo.manager.save.mockImplementation(async (p) => p);

      const result = await service.lockCapital('pool-1', 1000);

      expect(pool.lockedCapital).toBe(3000); // 2000 + 1000
      expect(repo.manager.save).toHaveBeenCalledWith(pool);
    });

    it('should lock capital with queryRunner using its manager', async () => {
      const pool = { ...mockPool };
      const queryRunner = {
        manager: {
          findOne: jest.fn().mockResolvedValue(pool),
          save: jest.fn().mockImplementation(async (p) => p),
        },
      } as any;

      await service.lockCapital('pool-1', 3000, queryRunner);

      expect(pool.lockedCapital).toBe(5000); // 2000 + 3000
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(InsurancePool, {
        where: { id: 'pool-1' },
      });
      expect(queryRunner.manager.save).toHaveBeenCalledWith(pool);
    });
  });
});
