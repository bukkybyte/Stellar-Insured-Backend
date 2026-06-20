import { ReinsuranceService } from './reinsurance.service';

describe('ReinsuranceService', () => {
  let service: ReinsuranceService;
  let prisma: any;
  let auditService: any;

  beforeEach(() => {
    prisma = {
      reinsuranceContract: {
        create: jest.fn(),
      },
    };

    auditService = {
      logCreate: jest.fn(),
    };

    service = new ReinsuranceService(prisma, auditService);
    jest.clearAllMocks();
  });

  describe('createContract', () => {
    it('should create and save a reinsurance contract', async () => {
      const contractData = {
        poolId: 'pool-1',
        coverageLimit: 50000,
        premiumRate: 0.02,
      };

      const createdContract = { id: 'contract-1', ...contractData, createdAt: new Date() };
      prisma.reinsuranceContract.create.mockResolvedValue(createdContract);

      const result = await service.createContract('pool-1', 50000, 0.02);

      expect(prisma.reinsuranceContract.create).toHaveBeenCalledWith({
        data: {
          poolId: 'pool-1',
          coverageLimit: 50000,
          premiumRate: 0.02,
        },
      });
      expect(result).toEqual(createdContract);
    });

    it('should call auditService.logCreate after saving', async () => {
      const createdContract = {
        id: 'contract-1',
        poolId: 'pool-1',
        coverageLimit: 100000,
        premiumRate: 0.05,
        createdAt: new Date(),
      };
      prisma.reinsuranceContract.create.mockResolvedValue(createdContract);

      await service.createContract('pool-1', 100000, 0.05);

      expect(auditService.logCreate).toHaveBeenCalledWith(
        'ReinsuranceContract',
        'contract-1',
        createdContract,
      );
    });

    it('should pass correct parameters to prisma.reinsuranceContract.create', async () => {
      const createdContract = { id: 'c-2', poolId: 'p-2', coverageLimit: 25000, premiumRate: 0.03 };
      prisma.reinsuranceContract.create.mockResolvedValue(createdContract);

      await service.createContract('p-2', 25000, 0.03);

      expect(prisma.reinsuranceContract.create).toHaveBeenCalledWith({
        data: {
          poolId: 'p-2',
          coverageLimit: 25000,
          premiumRate: 0.03,
        },
      });
    });
  });
});
