import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateApiGroupDto {
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
  parentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  apiIds?: string[];
}
