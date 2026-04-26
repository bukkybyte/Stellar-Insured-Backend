import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ClaimStatus } from '../enums/claim-status.enum';
import { InsurancePolicy } from './insurance-policy.entity';

@Entity('claims')
export class Claim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  policyId: string;

  @ManyToOne(() => InsurancePolicy, (policy) => policy.claims, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policyId' })
  policy: InsurancePolicy;

  @Column('decimal')
  claimAmount: number;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ClaimStatus,
    default: ClaimStatus.PENDING
  })
  status: ClaimStatus;

  @Column('decimal', { nullable: true })
  payoutAmount?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
