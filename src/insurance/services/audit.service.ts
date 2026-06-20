import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuditAction } from '../enums/audit-action.enum';
import { PrismaService } from '../../prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private request: Request,
  ) {}

  private getUserId(): string | undefined {
    return (this.request as any).user?.id;
  }

  private getIpAddress(): string | undefined {
    return this.request.ip || this.request.connection.remoteAddress;
  }

  private getUserAgent(): string | undefined {
    return this.request.get('User-Agent');
  }

  async log(
    action: AuditAction,
    entityType: string,
    entityId: string,
    beforeState?: any,
    afterState?: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: this.getUserId(),
        action,
        entityType,
        entityId,
        beforeState: beforeState ?? undefined,
        afterState: afterState ?? undefined,
        ipAddress: this.getIpAddress(),
        userAgent: this.getUserAgent(),
        transactionHash,
        reason,
        timestamp: new Date(),
      },
    });
  }

  async logCreate(
    entityType: string,
    entityId: string,
    afterState: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.CREATE, entityType, entityId, null, afterState, transactionHash, reason);
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    beforeState: any,
    afterState: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.UPDATE, entityType, entityId, beforeState, afterState, transactionHash, reason);
  }

  async logDelete(
    entityType: string,
    entityId: string,
    beforeState: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.DELETE, entityType, entityId, beforeState, null, transactionHash, reason);
  }

  async logApprove(
    entityType: string,
    entityId: string,
    beforeState?: any,
    afterState?: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.APPROVE, entityType, entityId, beforeState, afterState, transactionHash, reason);
  }

  async logReject(
    entityType: string,
    entityId: string,
    beforeState?: any,
    afterState?: any,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.REJECT, entityType, entityId, beforeState, afterState, undefined, reason);
  }

  async logPayout(
    entityType: string,
    entityId: string,
    beforeState?: any,
    afterState?: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.PAYOUT, entityType, entityId, beforeState, afterState, transactionHash, reason);
  }

  async logPurchase(
    entityType: string,
    entityId: string,
    afterState: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.PURCHASE, entityType, entityId, null, afterState, transactionHash, reason);
  }

  async logAddCapital(
    entityType: string,
    entityId: string,
    beforeState: any,
    afterState: any,
    transactionHash?: string,
    reason?: string,
  ): Promise<void> {
    await this.log(AuditAction.ADD_CAPITAL, entityType, entityId, beforeState, afterState, transactionHash, reason);
  }
}
