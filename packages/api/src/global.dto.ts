import { Transform } from 'class-transformer';
import { IsOptional, IsInt, Min } from 'class-validator';

//#############################################################
// Global DTO Class
//#############################################################
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number;
}
