import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  PAYOUT = 'PAYOUT',
  PURCHASE = 'PURCHASE',
  ADD_CAPITAL = 'ADD_CAPITAL',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  @Index()
  userId?: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column()
  @Index()
  entityType: string;

  @Column()
  @Index()
  entityId: string;

  @Column({ type: 'json', nullable: true })
  beforeState?: any;

  @Column({ type: 'json', nullable: true })
  afterState?: any;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  transactionHash?: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;
}