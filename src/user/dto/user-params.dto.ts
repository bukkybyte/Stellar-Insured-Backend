import { IsString, IsNotEmpty } from 'class-validator';

export class UserParamsDto {
  @IsString()
  @IsNotEmpty()
  id: string;
}
