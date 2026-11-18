import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateApiDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  specType?: string;

  @IsOptional()
  @IsString()
  specId?: string;

  @IsOptional()
  @IsString()
  specVersion?: string;

  @IsOptional()
  operations?: object;
}
