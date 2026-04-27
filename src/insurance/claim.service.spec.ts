import { ClaimService } from './claim.service';
import { Claim } from './entities/claim.entity';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { ClaimStatus } from './enums/claim-status.enum';
import { PolicyStatus } from './enums/policy-status.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ClaimService', () => {
  let service: ClaimService;
  let claimRepo: any;
  let policyRepo: any;
  let encryption: any;
  let auditService: any;

  const mockPolicy: Partial<InsurancePolicy> = {
    id: 'policy-1',
    userId: 'user-1',
    poolId: 'pool-1',
    status: PolicyStatus.ACTIVE,
    coverageAmount: 100000,
    premium: 5000,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-01-01'),
  };

  const mockClaim: Partial<Claim> = {
    id: 'claim-1',
    policyId: 'policy-1',
    claimAmount: 50000,
    status: ClaimStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    policy: mockPolicy as InsurancePolicy,
  };

  beforeEach(() => {
    claimRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    };

    policyRepo = {
      findOne: jest.fn(),
    };

    encryption = {
      encrypt: jest.fn((val: string) => `enc:${val}`),
      decrypt: jest.fn((val: string) => val.replace('enc:', '')),
    };

    auditService = {
      log: jest.fn(),
      logCreate: jest.fn(),
      logApprove: jest.fn(),
      logReject: jest.fn(),
      logPayout: jest.fn(),
    };

    service = new ClaimService(claimRepo, policyRepo, encryption, auditService);
    jest.clearAllMocks();
  });

  describe('createClaim', () => {
    it('should create a claim with encrypted claim amount', async () => {
      const createdClaim = { id: 'claim-new', policyId: 'policy-1', claimAmount: 50000, status: ClaimStatus.PENDING };
      claimRepo.create.mockReturnValue(createdClaim);
      claimRepo.save.mockResolvedValue(createdClaim);

      const result = await service.createClaim('policy-1', 50000);

      expect(encryption.encrypt).toHaveBeenCalledWith('50000');
      expect(claimRepo.create).toHaveBeenCalledWith({
        policyId: 'policy-1',
        claimAmount: expect.any(Number),
        status: ClaimStatus.PENDING,
      });
      expect(auditService.logCreate).toHaveBeenCalledWith('Claim', 'claim-new', createdClaim);
    });
  });

  describe('assessClaim', () => {
    it('should throw NotFoundException if claim does not exist', async () => {
      claimRepo.findOne.mockResolvedValue(null);

      await expect(service.assessClaim('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if policy is not found on claim', async () => {
      const claimWithoutPolicy = { ...mockClaim, policy: null };
      claimRepo.findOne.mockResolvedValue(claimWithoutPolicy);

      await expect(service.assessClaim('claim-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject claim if policy is not active', async () => {
      const inactivePolicy = { ...mockPolicy, status: PolicyStatus.EXPIRED };
      const claim = { ...mockClaim, policy: inactivePolicy };

      claimRepo.findOne.mockResolvedValue(claim);
      claimRepo.save.mockResolvedValue({ ...claim, status: ClaimStatus.REJECTED });

      await expect(service.assessClaim('claim-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject claim if claim amount exceeds coverage', async () => {
      const claim = { ...mockClaim, claimAmount: 200000, policy: mockPolicy };

      claimRepo.findOne.mockResolvedValue(claim);
      claimRepo.save.mockResolvedValue({ ...claim, status: ClaimStatus.REJECTED });

      await expect(service.assessClaim('claim-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject claim if oracle verification fails (expired policy)', async () => {
      const expiredPolicy = { ...mockPolicy, status: PolicyStatus.ACTIVE, endDate: new Date('2020-01-01') };
      const claim = { ...mockClaim, claimAmount: 50000, policy: expiredPolicy };

      // First call for assessClaim, second for verifyOracle
      claimRepo.findOne
        .mockResolvedValueOnce(claim) // assessClaim
        .mockResolvedValueOnce({ ...claim, policy: expiredPolicy }); // verifyOracle

      // No fraud detection hits (count returns 0)
      claimRepo.count.mockResolvedValue(0);
      claimRepo.save.mockResolvedValue({ ...claim, status: ClaimStatus.REJECTED });

      await expect(service.assessClaim('claim-1')).rejects.toThrow(BadRequestException);
    });

    it('should approve claim when all checks pass', async () => {
      const claim = { ...mockClaim, claimAmount: 50000, policy: mockPolicy };

      // assessClaim findOne
      claimRepo.findOne
        .mockResolvedValueOnce(claim)
        // verifyOracle findOne
        .mockResolvedValueOnce({ ...claim, policy: mockPolicy });

      // No fraud indicators
      claimRepo.count.mockResolvedValue(0);

      const approvedClaim = { ...claim, status: ClaimStatus.APPROVED, payoutAmount: 50000 };
      claimRepo.save.mockResolvedValue(approvedClaim);

      const result = await service.assessClaim('claim-1');

      expect(result.status).toBe(ClaimStatus.APPROVED);
      expect(result.payoutAmount).toBe(50000);
      expect(auditService.logApprove).toHaveBeenCalled();
    });

    it('should detect fraud and log but still approve if only 1 indicator', async () => {
      const claim = { ...mockClaim, claimAmount: 50000, policy: mockPolicy };

      claimRepo.findOne
        .mockResolvedValueOnce(claim)
        .mockResolvedValueOnce({ ...claim, policy: mockPolicy });

      // One fraud indicator: duplicate claims
      claimRepo.count
        .mockResolvedValueOnce(1) // duplicate claims count > 0
        .mockResolvedValueOnce(0); // recent claims count < 3

      const approvedClaim = { ...claim, status: ClaimStatus.APPROVED, payoutAmount: 50000 };
      claimRepo.save.mockResolvedValue(approvedClaim);

      const result = await service.assessClaim('claim-1');

      // Only 1 indicator means fraud detection returns false (needs >= 2)
      expect(result.status).toBe(ClaimStatus.APPROVED);
    });

    it('should detect fraud with 2+ indicators and log fraud event but not reject (fraud is logged, not blocking)', async () => {
      const recentDate = new Date();
      const claim = {
        ...mockClaim,
        claimAmount: 50000,
        policy: mockPolicy,
        createdAt: new Date('2026-04-27T03:00:00Z'), // 3 AM = unusual timing
      };

      claimRepo.findOne
        .mockResolvedValueOnce(claim)
        .mockResolvedValueOnce({ ...claim, policy: mockPolicy });

      // Two fraud indicators: duplicate + high frequency + unusual timing
      claimRepo.count
        .mockResolvedValueOnce(1) // duplicate claims
        .mockResolvedValueOnce(4); // recent claims >= 3

      const approvedClaim = { ...claim, status: ClaimStatus.APPROVED, payoutAmount: 50000 };
      claimRepo.save.mockResolvedValue(approvedClaim);

      const result = await service.assessClaim('claim-1');

      // Fraud is logged but claim can still be approved (oracle passes)
      expect(auditService.log).toHaveBeenCalledWith(
        expect.anything(), // AuditAction.FRAUD_DETECTED
        'Claim',
        'claim-1',
        expect.any(Object),
        expect.any(Object),
        undefined,
        'High fraud risk score detected',
      );
    });
  });

  describe('payClaim', () => {
    it('should throw NotFoundException if claim does not exist', async () => {
      claimRepo.findOne.mockResolvedValue(null);

      await expect(service.payClaim('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should update claim status to PAID', async () => {
      const claim = { ...mockClaim };
      claimRepo.findOne.mockResolvedValue(claim);

      const paidClaim = { ...claim, status: ClaimStatus.PAID };
      claimRepo.save.mockResolvedValue(paidClaim);

      const result = await service.payClaim('claim-1');

      expect(claim.status).toBe(ClaimStatus.PAID);
      expect(result.status).toBe(ClaimStatus.PAID);
    });

    it('should call auditService.logPayout after paying', async () => {
      const claim = { ...mockClaim };
      claimRepo.findOne.mockResolvedValue(claim);
      claimRepo.save.mockResolvedValue({ ...claim, status: ClaimStatus.PAID });

      await service.payClaim('claim-1');

      expect(auditService.logPayout).toHaveBeenCalledWith(
        'Claim',
        'claim-1',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
