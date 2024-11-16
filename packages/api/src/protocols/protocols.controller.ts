import { Controller, Get, Query } from '@nestjs/common';
import { ProtocolsService } from './protocols.service';
import { SkipAuth } from '../auth/auth.guard';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  OrganizationsDto,
  RequireProtocolDto,
  ProtocolDto,
} from './protocol.dto';

@Controller('protocols')
export class ProtocolsController {
  constructor(private readonly protocolsService: ProtocolsService) {}

  @SkipAuth()
  @Get()
  @ApiOperation({
    summary: 'Get organizations',
    description:
      'Retrieve a list of organizations. Optionally filter by protocol name or tags. If no filter is set, it will return all organizations.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter organizations by',
    type: String,
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    description:
      'Optional tag to filter organizations by (all organizations that have at least this tag)',
    type: String,
  })
  @ApiQuery({
    name: 'hasAllTags',
    required: false,
    description:
      'Optional tags to filter organizations by (selects organizations that exclusively have these tags)',
    type: [String],
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
  async getOrganizations(@Query() query?: OrganizationsDto) {
    const { protocolName, tag, hasAllTags, page = 0, pageSize = 10 } = query;
    return this.protocolsService.getOrganizations({
      protocolName,
      tag,
      hasAllTags,
      page,
      pageSize,
    });
  }

  @SkipAuth()
  @Get('total-tve')
  @ApiOperation({
    summary: 'Get total TVE',
    description:
      'Retrieve the total TVE for all repositories in organizations. Optionally filter by protocol name.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  async getTotalTVE(@Query() query?: ProtocolDto) {
    const { protocolName } = query;
    const totalTVE = await this.protocolsService.getTotalTVE({
      protocolName,
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
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  async getTotalCommits(@Query() query?: ProtocolDto) {
    const { protocolName } = query;
    const totalCommits = await this.protocolsService.getTotalCommits({
      protocolName,
    });
    return { totalCommits };
  }

  @SkipAuth()
  @Get('repositories')
  @ApiOperation({
    summary: 'Get repositories',
    description:
      'Retrieve a list of repositories. Optionally filter by protocol name. If no filter is set, it will return all repositories.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  async getRepositories(@Query() query?: ProtocolDto) {
    const { protocolName } = query;
    return this.protocolsService.getRepositories({
      protocolName,
    });
  }

  @SkipAuth()
  @Get('reputation-score-historic')
  @ApiOperation({
    summary: 'Get reputation score historic',
    description:
      'Retrieve the historical reputation scores of protocols. Optionally filter by protocol name. If no filter is set, it will return historical reputation scores for all protocols.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  async getReputationScoreHistoric(@Query() query?: ProtocolDto) {
    const { protocolName } = query;
    return this.protocolsService.getReputationScoreHistoric({
      protocolName,
    });
  }

  @SkipAuth()
  @Get('average-reputation-score')
  @ApiOperation({
    summary: 'Get average reputation score',
    description:
      'Retrieve the average reputation score for organizations. Optionally filter by protocol name.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  async getAverageReputationScore(@Query() query?: ProtocolDto) {
    const { protocolName } = query;
    const averageReputationScore =
      await this.protocolsService.getAverageReputationScore({
        protocolName,
      });
    return { averageReputationScore };
  }

  @SkipAuth()
  @Get('last-commit-timestamp')
  @ApiOperation({
    summary: 'Get last commit timestamp',
    description:
      'Retrieve the last commit timestamp by contributor. Optionally filter by contributor name and protocol name.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  @ApiQuery({
    name: 'contributorName',
    required: false,
    description: 'Optional contributor name to filter by',
    type: String,
  })
  async getLastCommitTimestamp(@Query() query?: ProtocolDto) {
    const { contributorName, protocolName } = query;
    return this.protocolsService.getLastCommitTimestamp({
      contributorName,
      protocolName,
    });
  }

  @SkipAuth()
  @Get('recent-developers')
  @ApiOperation({
    summary: 'Get recent developers for a specific protocol',
  })
  @ApiQuery({
    name: 'protocolName',
    required: true,
    description: 'Protocol name to filter by',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Optional page index, starts at 1, defaults to 1',
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Optional page size, defaults to 10',
    type: Number,
  })
  async getRecentDevelopers(@Query() query: RequireProtocolDto) {
    const { protocolName, page = 1, pageSize = 10 } = query;
    const developers = await this.protocolsService.getMostRecentDevelopers({
      protocolName: protocolName,
      page,
      pageSize,
    });

    return developers;
  }

  @SkipAuth()
  @Get('proficient-developers')
  @ApiOperation({
    summary: 'Get developers with the most commits for a specific protocol',
  })
  @ApiQuery({
    name: 'protocolName',
    required: true,
    description: 'Protocol name to filter by',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Optional page index, starts at 1, defaults to 1',
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Optional page size, defaults to 10',
    type: Number,
  })
  async getProficientDevelopers(@Query() query: RequireProtocolDto) {
    const { protocolName, page = 1, pageSize = 10 } = query;
    const developers =
      await this.protocolsService.getDevelopersWithTheMostCommits({
        protocolName: protocolName,
        page,
        pageSize,
      });

    return developers;
  }

  @SkipAuth()
  @Get('churning-developers')
  @ApiOperation({
    summary:
      'Get a list of the churning developers that correspond to developers who have recently stope contributing  from other organization for a new one',
  })
  @ApiQuery({
    name: 'protocolName',
    required: true,
    description: 'Protocol name to filter by',
    type: String,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Optional page index, starts at 1, defaults to 1',
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Optional page size, defaults to 10',
    type: Number,
  })
  async getChurningDevelopers(@Query() query: RequireProtocolDto) {
    const { protocolName, page = 1, pageSize = 10 } = query;
    const developers = await this.protocolsService.getChurningDevelopers({
      protocolName: protocolName,
      page,
      pageSize,
    });

    return developers;
  }

  @SkipAuth()
  @Get('tags')
  @ApiOperation({
    summary: 'Get all unique tags',
    description:
      'Retrieve all unique tags. Optionally filter by protocol name.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  getUniqueTags(@Query() query?: ProtocolDto) {
    const { protocolName } = query;
    return this.protocolsService.getUniqueTags({ protocolName });
  }

  @SkipAuth()
  @Get('orgs-with-shared-devs')
  @ApiOperation({
    summary: 'Get all unique tags',
    description:
      'Retrieve all unique tags. Optionally filter by protocol name.',
  })
  @ApiQuery({
    name: 'protocolName',
    required: false,
    description: 'Optional protocol name to filter by',
    type: String,
  })
  getOrgsWithSharedDevs(@Query() query: RequireProtocolDto) {
    const { protocolName } = query;
    return this.protocolsService.getOrgsWithSharedDevs({ protocolName });
  }
}
