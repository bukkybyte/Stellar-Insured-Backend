import { IsEmail, IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsObject()
  @IsOptional()
  profileData?: any;

  @IsString()
  @IsOptional()
  pushSubscription?: any;
}
