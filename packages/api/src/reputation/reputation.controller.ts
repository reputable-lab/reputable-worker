import { Controller, Get, Query } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContributorDto } from './reputation.dto';

@Controller('reputation')
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Get('contributions-metrics')
  @ApiOperation({
    summary: 'Get contribution metrics for a contributor',
    description:
      'Retrieve a list of contribution metrics for a specific contributor.',
  })
  @ApiQuery({
    name: 'contributorName',
    required: true,
    description: 'The name of the contributor to filter by.',
    type: String,
  })
  async getContributions(@Query() query: ContributorDto) {
    const { contributorName } = query;
    return this.reputationService.getContributionsByContributor({
      contributorName,
    });
  }
}
