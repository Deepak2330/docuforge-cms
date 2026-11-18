import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateGraphqlSchemaDto {
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
  @MinLength(1)
  sdlContent: string;
}
