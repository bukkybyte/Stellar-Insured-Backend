import { ReinsuranceService } from './reinsurance.service';
import { ReinsuranceContract } from './entities/reinsurance-contract.entity';

describe('ReinsuranceService', () => {
  let service: ReinsuranceService;
  let repo: any;
  let auditService: any;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    auditService = {
      logCreate: jest.fn(),
    };

    service = new ReinsuranceService(repo, auditService);
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
      repo.create.mockReturnValue(createdContract);
      repo.save.mockResolvedValue(createdContract);

      const result = await service.createContract('pool-1', 50000, 0.02);

      expect(repo.create).toHaveBeenCalledWith({
        poolId: 'pool-1',
        coverageLimit: 50000,
        premiumRate: 0.02,
      });
      expect(repo.save).toHaveBeenCalledWith(createdContract);
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
      repo.create.mockReturnValue(createdContract);
      repo.save.mockResolvedValue(createdContract);

      await service.createContract('pool-1', 100000, 0.05);

      expect(auditService.logCreate).toHaveBeenCalledWith(
        'ReinsuranceContract',
        'contract-1',
        createdContract,
      );
    });

    it('should pass correct parameters to repo.create', async () => {
      const createdContract = { id: 'c-2', poolId: 'p-2', coverageLimit: 25000, premiumRate: 0.03 };
      repo.create.mockReturnValue(createdContract);
      repo.save.mockResolvedValue(createdContract);

      await service.createContract('p-2', 25000, 0.03);

      expect(repo.create).toHaveBeenCalledWith({
        poolId: 'p-2',
        coverageLimit: 25000,
        premiumRate: 0.03,
      });
    });
  });
});
