import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

<<<<<<< HEAD
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

  @Column({ nullable: true })
=======
  @ManyToOne(() => InsurancePolicy, (policy) => policy.claims, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policyId' })
  policy: InsurancePolicy;

  @Column('decimal')
  claimAmount: number;

  @Column({ type: 'enum', enum: ClaimStatus, default: ClaimStatus.PENDING })
  status: ClaimStatus;

  @Column('decimal', { nullable: true })
>>>>>>> f521d5bf94f52c42a24af763b17bbea68299cfb8
  payoutAmount?: number;

  @CreateDateColumn()
  createdAt: Date;
<<<<<<< HEAD

  @UpdateDateColumn()
  updatedAt: Date;
=======
>>>>>>> f521d5bf94f52c42a24af763b17bbea68299cfb8
}
