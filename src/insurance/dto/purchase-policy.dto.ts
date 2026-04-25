import { IsString, IsEnum, IsNumber, IsPositive, IsUUID } from 'class-validator';
import { RiskType } from '../enums/risk-type.enum';

export class PurchasePolicyDto {
  @IsString()
  userId: string;

  @IsString()
  poolId: string;

  @IsEnum(RiskType)
  riskType: RiskType;

  @IsNumber()
  @IsPositive()
  coverageAmount: number;
}
