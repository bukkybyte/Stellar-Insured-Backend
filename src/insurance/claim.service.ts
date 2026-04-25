import { Injectable, NotFoundException } from '@nestjs/common';
import { Claim } from './entities/claim.entity';
<<<<<<< HEAD
import { ClaimHistory } from './entities/claim-history.entity';
import { InsurancePolicy } from './entities/insurance-entity';
import { Repository, DataSource, Not, LessThan, MoreThan } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
=======
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
>>>>>>> f521d5bf94f52c42a24af763b17bbea68299cfb8
import { ClaimStatus } from './enums/claim-status.enum';
import { EncryptionService } from '../encryption/encryption.service';
import { AuditService } from './services/audit.service';

@Injectable()
export class ClaimService {
  constructor(
    @InjectRepository(Claim) private readonly repo: Repository<Claim>,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async assessClaim(claimId: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }
<<<<<<< HEAD

    // 1. Verify policy is active
    if (policy.status !== PolicyStatus.ACTIVE) {
      await this.updateStatus(claimId, ClaimStatus.REJECTED, `Policy is not active: ${policy.status}`, 'system');
      throw new BadRequestException('Cannot approve claim for inactive policy');
    }

    // 2. Check coverage limits
    if (Number(claim.claimAmount) > Number(policy.coverageAmount)) {
      await this.updateStatus(claimId, ClaimStatus.REJECTED, 'Claim amount exceeds coverage', 'system');
      throw new BadRequestException('Claim amount exceeds policy coverage amount');
    }

    // 3. Fraud Detection Placeholder
    const isFraudulent = await this.runFraudDetection(claim);
    if (isFraudulent) {
      // In a real system, we might flag for review instead of auto-rejecting
      this.logger.warn(`Fraud detection triggered for claim ${claimId}`);
    }

    // 4. Oracle Verification Placeholder
    const oracleVerified = await this.verifyOracle(claimId);
    if (!oracleVerified) {
      await this.updateStatus(claimId, ClaimStatus.REJECTED, 'Oracle verification failed', 'system');
      throw new BadRequestException('Oracle verification failed');
    }

    // 5. Calculate Payout (Applying assessment logic)
    const payoutAmount = claim.claimAmount; // Could be adjusted for depreciation/deductibles

    return this.updateStatus(
      claimId, 
      ClaimStatus.APPROVED, 
      'Automated assessment approved', 
      'system',
      { payoutAmount }
    );
  }

  private async runFraudDetection(claim: Claim): Promise<boolean> {
    const fraudIndicators = [];
    
    // 1. Duplicate claim detection (same policy, same amount within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const duplicateClaims = await this.repo.count({
      where: {
        policyId: claim.policyId,
        claimAmount: claim.claimAmount,
        status: Not(ClaimStatus.REJECTED),
        id: Not(claim.id),
        createdAt: MoreThan(thirtyDaysAgo)
      }
    });
    
    if (duplicateClaims > 0) {
      fraudIndicators.push('DUPLICATE_CLAIM');
    }
    
    // 2. High frequency claims detection (more than 3 claims in 90 days for same policy)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentClaims = await this.repo.count({
      where: {
        policyId: claim.policyId,
        createdAt: MoreThan(ninetyDaysAgo)
      }
    });
    
    if (recentClaims >= 3) {
      fraudIndicators.push('HIGH_FREQUENCY');
    }
    
    // 3. Suspicious timing detection (claims filed outside business hours or on weekends)
    const claimDate = new Date(claim.createdAt);
    const hour = claimDate.getHours();
    const dayOfWeek = claimDate.getDay();
    
    if (hour < 6 || hour > 22 || dayOfWeek === 0 || dayOfWeek === 6) {
      fraudIndicators.push('UNUSUAL_TIMING');
    }
    
    // 4. Amount pattern detection (round numbers or suspicious amounts)
    const claimAmount = Number(claim.claimAmount);
    if (claimAmount % 1000 === 0 || claimAmount % 500 === 0) {
      fraudIndicators.push('ROUND_AMOUNT');
    }
    
    // 5. Rapid succession detection (multiple policies with claims from same holder)
    const policy = await this.policyRepo.findOne({ where: { id: claim.policyId } });
    if (policy) {
      const holderRecentClaims = await this.repo
        .createQueryBuilder('claim')
        .leftJoin('insurance_policies', 'policy', 'claim.policyId = policy.id')
        .where('policy.holderId = :holderId', { holderId: policy.holderId })
        .andWhere('claim.createdAt > :sevenDaysAgo', { sevenDaysAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
        .andWhere('claim.id != :claimId', { claimId: claim.id })
        .getCount();
      
      if (holderRecentClaims >= 2) {
        fraudIndicators.push('MULTIPLE_POLICY_CLAIMS');
      }
    }
    
    // 6. Amount escalation detection (progressively larger claims)
    const previousClaims = await this.repo.find({
      where: {
        policyId: claim.policyId,
        id: Not(claim.id)
      },
      order: { createdAt: 'DESC' },
      take: 3
    });
    
    if (previousClaims.length > 0) {
      const avgPreviousAmount = previousClaims.reduce((sum, prevClaim) => 
        sum + Number(prevClaim.claimAmount), 0) / previousClaims.length;
      
      if (claimAmount > avgPreviousAmount * 2) {
        fraudIndicators.push('ESCALATING_AMOUNTS');
      }
    }
    
    // Log fraud indicators for audit
    if (fraudIndicators.length > 0) {
      this.logger.warn(`Fraud indicators detected for claim ${claim.id}: ${fraudIndicators.join(', ')}`);
      await this.audit.log('fraud_indicators_detected', 'system', '0.0.0.0', {
        claimId: claim.id,
        indicators: fraudIndicators
      });
    }
    
    // Consider fraud if multiple indicators are present
    return fraudIndicators.length >= 2;
  }

  private async verifyOracle(claimId: string): Promise<boolean> {
    this.logger.log(`Oracle verifying claim ${claimId}...`);
    
    try {
      const claim = await this.repo.findOne({ where: { id: claimId } });
      if (!claim) {
        this.logger.error(`Claim ${claimId} not found for oracle verification`);
        return false;
      }

      const policy = await this.policyRepo.findOne({ where: { id: claim.policyId } });
      if (!policy) {
        this.logger.error(`Policy ${claim.policyId} not found for oracle verification`);
        return false;
      }

      // 1. Verify policy is still active and valid
      const now = new Date();
      if (policy.status !== PolicyStatus.ACTIVE || policy.endDate < now) {
        this.logger.warn(`Policy ${claim.policyId} is not active or has expired`);
        return false;
      }

      // 2. Verify claim amount is within reasonable bounds
      const claimAmount = Number(claim.claimAmount);
      const coverageAmount = Number(policy.coverageAmount);
      
      if (claimAmount <= 0 || claimAmount > coverageAmount) {
        this.logger.warn(`Invalid claim amount: ${claimAmount} for coverage: ${coverageAmount}`);
        return false;
      }

      // 3. Check for suspicious claim patterns
      const suspiciousPatterns = await this.checkSuspiciousPatterns(claim, policy);
      if (suspiciousPatterns.length > 0) {
        this.logger.warn(`Suspicious patterns detected for claim ${claimId}: ${suspiciousPatterns.join(', ')}`);
        await this.audit.log('oracle_suspicious_patterns', 'system', '0.0.0.0', {
          claimId,
          patterns: suspiciousPatterns
        });
        return false;
      }

      // 4. External data validation (mock implementation)
      // In a real system, this would call external APIs to validate:
      // - Weather data for weather-related claims
      // - Police reports for theft claims
      // - Medical records for health claims
      const externalValidation = await this.performExternalValidation(claim);
      
      if (!externalValidation.valid) {
        this.logger.warn(`External validation failed for claim ${claimId}: ${externalValidation.reason}`);
        await this.audit.log('oracle_external_validation_failed', 'system', '0.0.0.0', {
          claimId,
          reason: externalValidation.reason
        });
        return false;
      }

      // 5. Risk assessment scoring
      const riskScore = await this.calculateRiskScore(claim, policy);
      this.logger.log(`Risk score for claim ${claimId}: ${riskScore}`);
      
      // Reject claims with high risk scores
      if (riskScore > 0.8) {
        this.logger.warn(`High risk score ${riskScore} for claim ${claimId}`);
        return false;
      }

      // Log successful verification
      await this.audit.log('oracle_verification_success', 'system', '0.0.0.0', {
        claimId,
        riskScore
      });

      return true;
    } catch (error) {
      this.logger.error(`Oracle verification failed for claim ${claimId}: ${error.message}`);
      await this.audit.log('oracle_verification_error', 'system', '0.0.0.0', {
        claimId,
        error: error.message
      });
      return false;
    }
  }

  private async checkSuspiciousPatterns(claim: Claim, policy: InsurancePolicy): Promise<string[]> {
    const patterns: string[] = [];
    
    // Check for claims filed immediately after policy start
    const policyStart = new Date(policy.startDate);
    const claimDate = new Date(claim.createdAt);
    const daysSincePolicyStart = (claimDate.getTime() - policyStart.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSincePolicyStart < 7) {
      patterns.push('EARLY_CLAIM');
    }

    // Check for claims near policy expiration
    const policyEnd = new Date(policy.endDate);
    const daysUntilExpiration = (policyEnd.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiration < 30) {
      patterns.push('LATE_CLAIM');
    }

    // Check for maximum coverage claims
    const claimAmount = Number(claim.claimAmount);
    const coverageAmount = Number(policy.coverageAmount);
    
    if (claimAmount >= coverageAmount * 0.95) {
      patterns.push('MAX_COVERAGE_CLAIM');
    }

    return patterns;
  }

  private async performExternalValidation(claim: Claim): Promise<{ valid: boolean; reason?: string }> {
    // Mock external validation - in production, this would call real external APIs
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Mock validation logic based on claim description
    if (claim.description) {
      const description = claim.description.toLowerCase();
      
      // Check for common fraud keywords
      const fraudKeywords = ['stolen', 'lost', 'disappeared', 'vanished', 'mysterious'];
      if (fraudKeywords.some(keyword => description.includes(keyword))) {
        return { valid: false, reason: 'Suspicious description detected' };
      }
    }

    // Simulate external data validation success
    return { valid: true };
  }

  private async calculateRiskScore(claim: Claim, policy: InsurancePolicy): Promise<number> {
    let riskScore = 0;
    
    // Base risk factors
    const claimAmount = Number(claim.claimAmount);
    const coverageAmount = Number(policy.coverageAmount);
    const claimRatio = claimAmount / coverageAmount;
    
    // Higher claim amounts increase risk
    riskScore += claimRatio * 0.3;
    
    // New policies have higher risk
    const policyAge = (Date.now() - new Date(policy.startDate).getTime()) / (1000 * 60 * 60 * 24);
    if (policyAge < 30) {
      riskScore += 0.2;
    }
    
    // Claims filed on weekends have higher risk
    const claimDate = new Date(claim.createdAt);
    const dayOfWeek = claimDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      riskScore += 0.1;
    }
    
    // Claims filed outside business hours have higher risk
    const hour = claimDate.getHours();
    if (hour < 9 || hour > 17) {
      riskScore += 0.1;
    }
    
    // Round number amounts are slightly riskier
    if (claimAmount % 1000 === 0) {
      riskScore += 0.05;
    }
    
    return Math.min(riskScore, 1.0); // Cap at 1.0
=======
    const beforeState = { ...claim };
    // Simplified automated assessment
    claim.status = ClaimStatus.APPROVED;
    claim.payoutAmount = claim.claimAmount;
    const updatedClaim = await this.repo.save(claim);
    await this.auditService.logApprove('Claim', claimId, beforeState, updatedClaim);
    return updatedClaim;
>>>>>>> f521d5bf94f52c42a24af763b17bbea68299cfb8
  }

  async payClaim(claimId: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundException(`Claim with ID ${claimId} not found`);
    }
    const beforeState = { ...claim };
    claim.status = ClaimStatus.PAID;
    const updatedClaim = await this.repo.save(claim);
    await this.auditService.logPayout('Claim', claimId, beforeState, updatedClaim);
    return updatedClaim;
  }

  async createClaim(policyId: string, claimAmount: number): Promise<Claim> {
    // Encrypt sensitive financial data
    const claim = this.repo.create({
      policyId,
      claimAmount: parseFloat(this.encryption.encrypt(claimAmount.toString())),
      status: ClaimStatus.PENDING,
    });
    const savedClaim = await this.repo.save(claim);
    await this.auditService.logCreate('Claim', savedClaim.id, savedClaim);
    return savedClaim;
  }
}
