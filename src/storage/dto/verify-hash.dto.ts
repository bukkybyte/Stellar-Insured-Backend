import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class VerifyHashDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'Hash must be alphanumeric',
  })
  hash!: string;
}
