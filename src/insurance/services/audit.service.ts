import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @Inject(REQUEST) private request: Request,
  ) {}

  private getUserId(): string | undefined {
    // Assuming user is attached to request by auth guard
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
    const auditLog = this.auditLogRepository.create({
      userId: this.getUserId(),
      action,
      entityType,
      entityId,
      beforeState,
      afterState,
      ipAddress: this.getIpAddress(),
      userAgent: this.getUserAgent(),
      transactionHash,
      reason,
      timestamp: new Date(),
    });

    await this.auditLogRepository.save(auditLog);
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