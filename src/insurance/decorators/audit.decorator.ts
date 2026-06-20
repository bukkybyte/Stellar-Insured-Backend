import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../enums/audit-action.enum';

export interface AuditMetadata {
  entityType: string;
  action: AuditAction;
  getEntityId: (args: any[]) => string;
  getBeforeState?: (entityId: string) => Promise<any>;
  reason?: string;
}

export const AUDIT_METADATA = 'audit';

export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_METADATA, metadata);