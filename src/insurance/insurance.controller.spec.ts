import { Test, TestingModule } from '@nestjs/testing';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { ClaimService } from './claim.service';
import { ReinsuranceService } from './reinsurance.service';
import { RiskType } from './enums/risk-type.enum';

describe('InsuranceController', () => {
  let controller: InsuranceController;
  let insuranceService: InsuranceService;
  let claimService: ClaimService;
  let reinsuranceService: ReinsuranceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsuranceController],
      providers: [
        {
          provide: InsuranceService,
          useValue: {
            purchasePolicy: jest.fn(),
          },
        },
        {
          provide: ClaimService,
          useValue: {
            assessClaim: jest.fn(),
            payClaim: jest.fn(),
          },
        },
        {
          provide: ReinsuranceService,
          useValue: {
            createContract: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<InsuranceController>(InsuranceController);
    insuranceService = module.get<InsuranceService>(InsuranceService);
    claimService = module.get<ClaimService>(ClaimService);
    reinsuranceService = module.get<ReinsuranceService>(ReinsuranceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('purchase', () => {
    it('should call insuranceService.purchasePolicy with dto values', async () => {
      const body = {
        userId: 'user-1',
        poolId: 'pool-1',
        riskType: RiskType.PROJECT_FAILURE,
        coverageAmount: 10000,
      };

      const expectedResult = { id: 'policy-1', ...body };
      (insuranceService.purchasePolicy as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.purchase(body);

      expect(insuranceService.purchasePolicy).toHaveBeenCalledWith(
        'user-1',
        'pool-1',
        RiskType.PROJECT_FAILURE,
        10000,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('assessClaim', () => {
    it('should call claimService.assessClaim with claimId', async () => {
      const expectedResult = { id: 'claim-1', status: 'APPROVED' };
      (claimService.assessClaim as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.assessClaim('claim-1');

      expect(claimService.assessClaim).toHaveBeenCalledWith('claim-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('payClaim', () => {
    it('should call claimService.payClaim with claimId', async () => {
      const expectedResult = { id: 'claim-1', status: 'PAID' };
      (claimService.payClaim as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.payClaim('claim-1');

      expect(claimService.payClaim).toHaveBeenCalledWith('claim-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('createReinsurance', () => {
    it('should call reinsuranceService.createContract with dto values', async () => {
      const body = {
        poolId: 'pool-1',
        coverageLimit: 50000,
        premiumRate: 0.02,
      };

      const expectedResult = { id: 'contract-1', ...body };
      (reinsuranceService.createContract as jest.Mock).mockResolvedValue(expectedResult);

      const result = await controller.createReinsurance(body);

      expect(reinsuranceService.createContract).toHaveBeenCalledWith('pool-1', 50000, 0.02);
      expect(result).toEqual(expectedResult);
    });
  });
});
