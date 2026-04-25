import { IsObject, IsOptional, IsString } from 'class-validator';

export class PinMetadataDto {
  @IsObject()
  metadata!: Record<string, any>;

  @IsOptional()
  @IsString()
  name?: string;
}
