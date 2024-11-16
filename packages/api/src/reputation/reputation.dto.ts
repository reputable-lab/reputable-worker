import { IsString } from 'class-validator';

export class ContributorDto {
  @IsString()
  contributorName: string;
}
