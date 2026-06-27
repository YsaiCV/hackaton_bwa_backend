import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResearchProcedureDto {
  @IsString()
  @MinLength(3)
  query: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  procedureType?: string;
}
