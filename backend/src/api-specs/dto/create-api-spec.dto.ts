import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateApiSpecDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MinLength(1)
  version: string;

  @IsString()
  specContent: string;

  @IsOptional()
  @IsString()
  specFormat?: string;
}
