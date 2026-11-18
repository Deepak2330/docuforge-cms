import { IsString, IsOptional, IsBoolean, IsArray, IsDateString, MinLength, MaxLength } from 'class-validator';

export class CreateReleaseNoteDto {
  @IsString() @MinLength(2) @MaxLength(200)
  title: string;

  @IsString() @MinLength(1)
  version: string;

  @IsDateString()
  releaseDate: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  features?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  improvements?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  bugFixes?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  breakingChanges?: string[];

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;
}
