import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RepositoryDto } from './repository.dto';

@Injectable()
export class RepositoriesService {
  constructor(private prisma: PrismaService) {}

  async getRepositories({ repositoryName, organizationName }: RepositoryDto) {
    const repositories = await this.prisma.repository.findMany({
      where:
        repositoryName && organizationName
          ? {
              name: { contains: repositoryName },
              organizationName: { contains: organizationName },
            }
          : {},
    });

    return repositories;
  }

  async getTotalTVE({ repositoryName, organizationName }: RepositoryDto) {
    const totalTVE = await this.prisma.contract.aggregate({
      _sum: {
        tve: true,
      },
      where:
        repositoryName && organizationName
          ? {
              repository: {
                name: { contains: repositoryName },
                organization: {
                  organizationName: {
                    contains: organizationName,
                    mode: 'insensitive',
                  },
                },
              },
            }
          : {},
    });

    return totalTVE._sum.tve ?? 0;
  }

  async getTotalCommits({ repositoryName, organizationName }: RepositoryDto) {
    const totalCommits = await this.prisma.repository.aggregate({
      _sum: {
        totalCommits: true,
      },
      where:
        repositoryName && organizationName
          ? {
              name: { contains: repositoryName },
              organization: {
                organizationName: { contains: organizationName },
              },
            }
          : {},
    });

    return totalCommits._sum.totalCommits ?? 0;
  }
}
