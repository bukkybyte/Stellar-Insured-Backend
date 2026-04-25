import { IsInt, IsPositive, IsString, Min, Max } from 'class-validator';

export class OptimizeImageDto {
  @IsString()
  imagePath!: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(8192)
  width!: number;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(8192)
  height!: number;
}
