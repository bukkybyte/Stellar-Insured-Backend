import { ClaimService } from './claim.service';
import { ClaimStatus } from './enums/claim-status.enum';
import { PolicyStatus } from './enums/policy-status.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ClaimService', () => {
  let service: ClaimService;
  let prisma: any;
  let auditService: any;

  const mockPolicy = {
    id: 'policy-1',
    userId: 'user-1',
    poolId: 'pool-1',
    status: PolicyStatus.ACTIVE,
    coverageAmount: 100000,
    premium: 5000,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2027-01-01'),
  };

  const mockClaim = {
    id: 'claim-1',
    policyId: 'policy-1',
    claimAmount: 50000,
    status: ClaimStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    policy: mockPolicy,
  };

  beforeEach(() => {
    prisma = {
      claim: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
    };

    auditService = {
      log: jest.fn(),
      logCreate: jest.fn(),
      logApprove: jest.fn(),
      logReject: jest.fn(),
      logPayout: jest.fn(),
      logUpdate: jest.fn(),
    };

    service = new ClaimService(prisma, auditService);
    jest.clearAllMocks();
  });

  describe('createClaim', () => {
    it('should create a claim with the plain, unencrypted claim amount', async () => {
      const createdClaim = { id: 'claim-new', policyId: 'policy-1', claimAmount: 50000, status: ClaimStatus.PENDING };
      prisma.claim.create.mockResolvedValue(createdClaim);

      const result = await service.createClaim('policy-1', 50000);

      // Regression for issue #399: claimAmount is a plain numeric(18,2) column.
      // It must be written as-is, not run through EncryptionService + parseFloat
      // (which previously corrupted it into NaN/garbage).
      expect(prisma.claim.create).toHaveBeenCalledWith({
        data: {
          policyId: 'policy-1',
          claimAmount: 50000,
          status: ClaimStatus.PENDING,
        },
      });
      expect(auditService.logCreate).toHaveBeenCalledWith('Claim', 'claim-new', createdClaim);
      expect(result.claimAmount).toBe(50000);
    });

    it('does not depend on EncryptionService for the claim amount', () => {
      expect(service['encryption']).toBeUndefined();
    });
  });

  describe('assessClaim', () => {
    it('should throw NotFoundException if claim does not exist', async () => {
      prisma.claim.findUnique.mockResolvedValue(null);

      await expect(service.assessClaim('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if policy is not found on claim', async () => {
      prisma.claim.findUnique.mockResolvedValue({ ...mockClaim, policy: null });

      await expect(service.assessClaim('claim-1')).rejects.toThrow(NotFoundException);
    });

    it('should reject claim if policy is not active', async () => {
      const inactivePolicy = { ...mockPolicy, status: PolicyStatus.EXPIRED };
      prisma.claim.findUnique.mockResolvedValue({ ...mockClaim, policy: inactivePolicy });
      prisma.claim.update.mockResolvedValue({ ...mockClaim, status: ClaimStatus.REJECTED, policy: inactivePolicy });

      await expect(service.assessClaim('claim-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject claim if claim amount exceeds coverage', async () => {
      const claim = { ...mockClaim, claimAmount: 200000 };
      prisma.claim.findUnique.mockResolvedValue(claim);
      prisma.claim.update.mockResolvedValue({ ...claim, status: ClaimStatus.REJECTED });

      await expect(service.assessClaim('claim-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject claim if oracle verification fails (expired policy)', async () => {
      const expiredPolicy = { ...mockPolicy, status: PolicyStatus.ACTIVE, endDate: new Date('2020-01-01') };
      const claim = { ...mockClaim, policy: expiredPolicy };

      // First call for assessClaim, second for updateStatus (rejection), third for verifyOracle
      prisma.claim.findUnique
        .mockResolvedValueOnce(claim)         // assessClaim main fetch
        .mockResolvedValueOnce(claim)         // updateStatus fetch (before rejection)
        .mockResolvedValueOnce({ ...claim, policy: expiredPolicy }); // verifyOracle fetch

      prisma.claim.count.mockResolvedValue(0);
      prisma.claim.update.mockResolvedValue({ ...claim, status: ClaimStatus.REJECTED });

      await expect(service.assessClaim('claim-1')).rejects.toThrow(BadRequestException);
    });

    it('should approve claim when all checks pass', async () => {
      const claim = { ...mockClaim, claimAmount: 50000 };
      const approvedClaim = { ...claim, status: ClaimStatus.APPROVED, payoutAmount: 50000 };

      prisma.claim.findUnique
        .mockResolvedValueOnce(claim)   // assessClaim
        .mockResolvedValueOnce(claim);  // verifyOracle

      prisma.claim.count.mockResolvedValue(0);
      prisma.claim.update.mockResolvedValue(approvedClaim);

      const result = await service.assessClaim('claim-1');

      expect(result.status).toBe(ClaimStatus.APPROVED);
      expect(auditService.logApprove).toHaveBeenCalled();
    });

    it('should detect fraud and log but still approve if only 1 indicator', async () => {
      const claim = { ...mockClaim, claimAmount: 50000 };
      const approvedClaim = { ...claim, status: ClaimStatus.APPROVED, payoutAmount: 50000 };

      prisma.claim.findUnique
        .mockResolvedValueOnce(claim)
        .mockResolvedValueOnce(claim);

      prisma.claim.count
        .mockResolvedValueOnce(1) // duplicate claims count > 0
        .mockResolvedValueOnce(0); // recent claims count < 3

      prisma.claim.update.mockResolvedValue(approvedClaim);

      const result = await service.assessClaim('claim-1');

      expect(result.status).toBe(ClaimStatus.APPROVED);
    });

    it('should detect fraud with 2+ indicators and log fraud event', async () => {
      const claim = {
        ...mockClaim,
        claimAmount: 50000,
        createdAt: new Date('2026-04-27T03:00:00Z'), // 3 AM = unusual timing
      };
      const approvedClaim = { ...claim, status: ClaimStatus.APPROVED, payoutAmount: 50000 };

      prisma.claim.findUnique
        .mockResolvedValueOnce(claim)
        .mockResolvedValueOnce(claim);

      prisma.claim.count
        .mockResolvedValueOnce(1) // duplicate claims
        .mockResolvedValueOnce(4); // recent claims >= 3

      prisma.claim.update.mockResolvedValue(approvedClaim);

      await service.assessClaim('claim-1');

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
      prisma.claim.findUnique.mockResolvedValue(null);

      await expect(service.payClaim('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should update claim status to PAID', async () => {
      const claim = { ...mockClaim };
      const paidClaim = { ...claim, status: ClaimStatus.PAID };
      prisma.claim.findUnique.mockResolvedValue(claim);
      prisma.claim.update.mockResolvedValue(paidClaim);

      const result = await service.payClaim('claim-1');

      expect(result.status).toBe(ClaimStatus.PAID);
    });

    it('should call auditService.logPayout after paying', async () => {
      const claim = { ...mockClaim };
      prisma.claim.findUnique.mockResolvedValue(claim);
      prisma.claim.update.mockResolvedValue({ ...claim, status: ClaimStatus.PAID });

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