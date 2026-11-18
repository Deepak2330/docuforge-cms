import { IsString, IsOptional, IsArray, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug may only contain lowercase letters, numbers and hyphens' })
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  docType?: DocumentType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  categoryId?: string;
}
