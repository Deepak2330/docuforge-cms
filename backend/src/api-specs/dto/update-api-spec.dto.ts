import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateApiSpecDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
