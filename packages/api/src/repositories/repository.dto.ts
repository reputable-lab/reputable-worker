import { IsOptional, IsString } from 'class-validator';

export class RepositoryDto {
  @IsOptional()
  @IsString()
  repositoryName?: string;

  @IsOptional()
  @IsString()
  organizationName?: string;
}
