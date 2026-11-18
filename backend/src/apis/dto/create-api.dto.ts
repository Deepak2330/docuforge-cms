import { IsString, IsOptional, IsArray, MinLength, MaxLength, IsJSON } from 'class-validator';

export class CreateApiDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name: string;

  @IsString()
  @MinLength(1)
  slug: string;

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
