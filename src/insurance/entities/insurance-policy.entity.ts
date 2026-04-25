import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RiskType } from '../enums/risk-type.enum';
import { Claim } from './claim.entity';
import { ReinsuranceContract } from './reinsurance-contract.entity';

@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: RiskType })
  riskType: RiskType;

  @Column('decimal')
  premium: number;

  @Column('decimal')
  coverageAmount: number;

  @Column()
  poolId: string;

  @ManyToOne(() => ReinsuranceContract, (contract) => contract.policies, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'poolId' })
  pool: ReinsuranceContract;

  @OneToMany(() => Claim, (claim) => claim.policy)
  claims: Claim[];

  @CreateDateColumn()
  createdAt: Date;
}
