import { Controller, Get, Query } from '@nestjs/common';
import { SkipAuth } from '../auth/auth.guard';
import { ContributorsService } from './contributors.service';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ContributorDto } from './contributor.dto';

/**
 * /contributors
 */
@Controller('contributors')
export class ContributorsController {
  constructor(private readonly contributorsService: ContributorsService) {}

  @SkipAuth()
  @Get('')
  @ApiOperation({
    summary: 'Get contributors',
    description:
      'Retrieve a list of contributors, ordered by lastRank ASC. Optionally filter by contributor name. If no filter is set, it returns all contributors.',
  })
  @ApiQuery({
    name: 'contributorName',
    required: false,
    description: 'Optional contributor name to filter by',
    type: String,
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    description: 'Optional organization tag to filter by',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Optional page index, starts at 0, defaults to 0',
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Optional page size, defaults to 10',
    type: Number,
  })
  async getContributors(@Query() query?: ContributorDto) {
    const { contributorName, tag, page = 0, pageSize = 10 } = query;
    return this.contributorsService.getContributors({
      contributorName,
      tag,
      page,
      pageSize,
    });
  }

  @SkipAuth()
  @Get('total-tve')
  @ApiOperation({
    summary: 'Get total TVE',
    description:
      'Retrieve the total TVE for all repositories in which the contributor has participated. Optionally filter by contributor name.',
  })
  @ApiQuery({
    name: 'contributorName',
    required: false,
    description: 'Optional contributor name to filter by',
    type: String,
  })
  async getTotalTVE(@Query() query?: ContributorDto) {
    const { contributorName } = query;
    const totalTVE = await this.contributorsService.getTotalTVE({
      contributorName,
    });
    return { totalTVE };
  }

  @SkipAuth()
  @Get('total-commits')
  @ApiOperation({
    summary: 'Get total commits',
    description:
      'Retrieve the total number of commits made by contributors. Optionally filter by contributor name. If no filter is set, it will return total commits for all contributors.',
  })
  @ApiQuery({
    name: 'contributorName',
    required: false,
    description: 'Optional contributor name to filter by',
    type: String,
  })
  async getTotalCommits(@Query() query?: ContributorDto) {
    const { contributorName } = query;
    return this.contributorsService.getTotalCommits({
      contributorName,
    });
  }

  @SkipAuth()
  @Get('reputation-score-historic')
  @ApiOperation({
    summary: 'Get reputation score historic',
    description:
      'Retrieve the historical reputation scores of contributors. Optionally filter by contributor name. If no filter is set, it will return historical reputation scores for all contributors.',
  })
  @ApiQuery({
    name: 'contributorName',
    required: false,
    description: 'Optional contributor name to filter by',
    type: String,
  })
  async getReputationScoreHistoric(@Query() query?: ContributorDto) {
    const { contributorName } = query;
    return this.contributorsService.getReputationScoreHistoric({
      contributorName,
    });
  }

  @SkipAuth()
  @Get('average-reputation-score')
  @ApiOperation({
    summary: 'Get average reputation score',
    description:
      'Retrieve the average reputation score filtered by repository name and organization name. Both parameters are optional but must be used together.',
  })
  @ApiQuery({
    name: 'contributorName',
    required: false,
    description: 'Optional contributor name to filter by',
    type: String,
  })
  async getAverageReputationScore(@Query() query: ContributorDto) {
    const { contributorName } = query;
    const averageReputationScore =
      await this.contributorsService.getAverageReputationScore({
        contributorName,
      });
    return { averageReputationScore };
  }

  @SkipAuth()
  @Get('count-contributors')
  @ApiOperation({
    summary: 'Get total count ot contributors',
  })
  async getCountContributors() {
    const countContributors =
      await this.contributorsService.countContributors();
    return { countContributors };
  }

  @SkipAuth()
  @Get('attestation')
  @ApiOperation({
    summary: 'Get developer attestations',
    description:
      'Retrieve attestations of developers. Optionally filter by contributor name.',
  })
  @ApiQuery({
    name: 'contributorName',
    required: false,
    description: 'Optional contributor name to filter by',
    type: String,
  })
  async getDeveloperAttestations(@Query() query: ContributorDto) {
    const { contributorName } = query;
    const attestations = await this.contributorsService.getAttestations({
      contributorName,
    });
    return { attestations };
  }
}
