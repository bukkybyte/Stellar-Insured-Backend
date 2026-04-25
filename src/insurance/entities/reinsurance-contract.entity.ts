import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { InsurancePolicy } from './insurance-policy.entity';

@Entity('reinsurance_contracts')
export class ReinsuranceContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  poolId: string;

  @Column('decimal')
  coverageLimit: number;

  @Column('decimal')
  premiumRate: number;

  @OneToMany(() => InsurancePolicy, (policy) => policy.pool)
  policies: InsurancePolicy[];

  @CreateDateColumn()
  createdAt: Date;
}
