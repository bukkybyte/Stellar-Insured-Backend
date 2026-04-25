import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from '../services/audit.service';
import { AUDIT_METADATA, AuditMetadata } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const metadata = this.reflector.get<AuditMetadata>(AUDIT_METADATA, context.getHandler());

    if (!metadata) {
      return next.handle();
    }

    const args = context.getArgs();
    const entityId = metadata.getEntityId(args);
    let beforeState: any = null;

    if (metadata.getBeforeState) {
      beforeState = await metadata.getBeforeState(entityId);
    }

    return next.handle().pipe(
      tap(async (response) => {
        const afterState = response; // Assume method returns the entity
        await this.auditService.log(
          metadata.action,
          metadata.entityType,
          entityId,
          beforeState,
          afterState,
          undefined, // transactionHash, can be added if response has it
          metadata.reason,
        );
      }),
    );
  }
}