import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/global.dto';

//#############################################################
// External DTO Class
//#############################################################
export class ContributorDto extends PaginationDto {
  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  contributorName?: string;
}
