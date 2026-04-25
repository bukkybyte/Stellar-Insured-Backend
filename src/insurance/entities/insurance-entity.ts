import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PolicyStatus } from '../enums/policy-status.enum';

@Entity('insurance_policies')
export class InsurancePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  holderId: string;

  @Column('decimal')
  coverageAmount: number;

  @Column('decimal')
  premium: number;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({
    type: 'enum',
    enum: PolicyStatus,
    default: PolicyStatus.ACTIVE
  })
  status: PolicyStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
