import { IsString, IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreateClaimDto {
  @IsUUID()
  policyId!: string;

  @IsNumber()
  @IsPositive()
  claimAmount!: number;
}
