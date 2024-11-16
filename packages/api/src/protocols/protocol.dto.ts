import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../global.dto';

//#############################################################
// External DTO Class
//#############################################################
export class OrganizationsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  protocolName?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Type(() => String)
  hasAllTags?: string[];
}

export class RequireProtocolDto extends PaginationDto {
  @IsString()
  protocolName: string;
}

export class ProtocolDto {
  @IsOptional()
  @IsString()
  contributorName?: string;

  @IsOptional()
  @IsString()
  protocolName?: string;
}
