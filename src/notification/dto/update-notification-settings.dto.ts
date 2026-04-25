import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyContributions?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMilestones?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyDeadlines?: boolean;
}
