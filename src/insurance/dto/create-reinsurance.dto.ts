import { IsString, IsNumber, IsPositive, Min, Max } from 'class-validator';

export class CreateReinsuranceDto {
  @IsString()
  poolId: string;

  @IsNumber()
  @IsPositive()
  coverageLimit: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  premiumRate: number;
}
