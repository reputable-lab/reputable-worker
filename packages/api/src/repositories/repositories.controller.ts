import { Controller, Get, Query } from '@nestjs/common';
import { SkipAuth } from '../auth/auth.guard';
import { RepositoriesService } from './repositories.service';
import { RepositoryDto } from './repository.dto';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @SkipAuth()
  @Get('')
  @ApiOperation({
    summary: 'Get repositories',
    description:
      'Retrieve a list of repositories optionally by filtered with repository name and organization name. Both parameters are optional but must be used together.',
  })
  @ApiQuery({
    name: 'organizationName',
    required: false,
    description:
      'Optional organization name to filter by. Must be used with repositoryName.',
    type: String,
  })
  @ApiQuery({
    name: 'repositoryName',
    required: false,
    description:
      'Optional repository name to filter by. Must be used with organizationName.',
    type: String,
  })
  async getRepositories(@Query() query: RepositoryDto) {
    const { repositoryName, organizationName } = query;
    const repositories = await this.repositoriesService.getRepositories({
      repositoryName,
      organizationName,
    });
    return { repositories };
  }

  @SkipAuth()
  @Get('total-tve')
  @ApiOperation({
    summary: 'Get total TVE',
    description:
      'Retrieve the total TVE filtered optionally by repository name and organization name. Both parameters are optional but must be used together.',
  })
  @ApiQuery({
    name: 'organizationName',
    required: false,
    description:
      'Optional organization name to filter by. Must be used with repositoryName.',
    type: String,
  })
  @ApiQuery({
    name: 'repositoryName',
    required: false,
    description:
      'Optional repository name to filter by. Must be used with organizationName.',
    type: String,
  })
  async getTotalTVE(@Query() query: RepositoryDto) {
    const { repositoryName, organizationName } = query;
    const totalTve = await this.repositoriesService.getTotalTVE({
      repositoryName,
      organizationName,
    });
    return { totalTve };
  }

  @SkipAuth()
  @Get('total-commits')
  @ApiOperation({
    summary: 'Get total commits',
    description:
      'Retrieve the total number of commits optionally filtered by repository name and organization name. Both parameters are optional but must be used together.',
  })
  @ApiQuery({
    name: 'organizationName',
    required: false,
    description:
      'Optional organization name to filter by. Must be used with repositoryName.',
    type: String,
  })
  @ApiQuery({
    name: 'repositoryName',
    required: false,
    description:
      'Optional repository name to filter by. Must be used with organizationName.',
    type: String,
  })
  async getTotalCommits(@Query() query: RepositoryDto) {
    const { repositoryName, organizationName } = query;
    const totalCommits = await this.repositoriesService.getTotalCommits({
      repositoryName,
      organizationName,
    });
    return { totalCommits };
  }
}
