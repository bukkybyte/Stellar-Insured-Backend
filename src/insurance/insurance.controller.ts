import { Controller, Post, Get, Param, Body, UseGuards,  UseInterceptors } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InsuranceService } from './insurance.service';
import { ClaimService } from './claim.service';
import { ReinsuranceService } from './reinsurance.service';
import { PurchasePolicyDto } from './dto/purchase-policy.dto';
import { CreateReinsuranceDto } from './dto/create-reinsurance.dto';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';

@Controller({ path: 'insurance', version: '1' })
export class InsuranceController {
  constructor(
    private readonly insurance: InsuranceService,
    private readonly claims: ClaimService,
    private readonly reinsurance: ReinsuranceService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 purchases per hour
  @Post('purchase')
  @UseGuards(CsrfGuard)
  @Roles(Role.USER, Role.UNDERWRITER, Role.ADMIN)
  async purchase(@Body() body: { userId: string; poolId: string; riskType: RiskType; coverageAmount: number }) {
  @UseInterceptors(IdempotencyInterceptor)
  async purchase(@Body() body: PurchasePolicyDto) {
    return this.insurance.purchasePolicy(body.userId, body.poolId, body.riskType, body.coverageAmount);
  }

  @Throttle({ default: { limit: 50, ttl: 3600000 } }) // 50 claim assessments per hour
  @Post('claims/:claimId/assess')
  @Throttle({ admin: { limit: 100, ttl: 60000 } }) // 100 assessments per minute for admins
  @UseGuards(CsrfGuard)
  @Roles(Role.UNDERWRITER, Role.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async assessClaim(@Param('claimId') claimId: string) {
    return this.claims.assessClaim(claimId);
  }

  @Throttle({ default: { limit: 30, ttl: 3600000 } }) // 30 claim payments per hour
  @Post('claims/:claimId/pay')
  @Throttle({ admin: { limit: 50, ttl: 60000 } }) // 50 payouts per minute for admins
  @UseGuards(CsrfGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(IdempotencyInterceptor)
  async payClaim(@Param('claimId') claimId: string) {
    return this.claims.payClaim(claimId);
  }

  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 reinsurance contracts per hour
  @Post('reinsurance')
  @Throttle({ admin: { limit: 20, ttl: 60000 } }) // 20 contracts per minute for admins
  @UseGuards(CsrfGuard)
  @Roles(Role.ADMIN)
  async createReinsurance(@Body() body: { poolId: string; coverageLimit: number; premiumRate: number }) {
  @UseInterceptors(IdempotencyInterceptor)
  async createReinsurance(@Body() body: CreateReinsuranceDto) {
    return this.reinsurance.createContract(body.poolId, body.coverageLimit, body.premiumRate);
  }
}
