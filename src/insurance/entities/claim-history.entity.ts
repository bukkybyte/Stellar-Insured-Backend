import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { Claim } from './claim.entity';

@Entity('claim_history')
export class ClaimHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  claimId: string;

  @Column({
    type: 'varchar',
    length: 50
  })
  status: string;

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  actorId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Claim)
  claim: Claim;
}
