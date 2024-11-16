import { Injectable } from '@nestjs/common';
import { Prisma } from '@reputable/data-warehouse';
import { PrismaService } from '../prisma/prisma.service';
import { ContributorDto } from './contributor.dto';

@Injectable()
export class ContributorsService {
  constructor(private prisma: PrismaService) {}

  async getContributors({
    contributorName,
    tag,
    page,
    pageSize,
  }: ContributorDto) {
    const contributorsWhere: Prisma.ContributorWhereInput = {
      contributorName: {
        contains: contributorName,
        mode: 'insensitive',
      },
      lastRank: {
        gte: 0,
      },
      ...(tag && {
        contributions: {
          every: {
            repository: {
              tags: {
                has: tag,
              },
            },
          },
        },
      }),
    };

    // Run count and main query in parallel for efficiency
    const [countContributors, contributors] = await Promise.all([
      this.prisma.contributor.count({
        where: contributorsWhere,
      }),
      this.prisma.contributor.findMany({
        where: contributorsWhere,
        select: {
          contributorName: true,
          totalCommits: true,
          followersCount: true,
          lastReputationScore: true,
          lastRank: true,
          contributions: {
            include: {
              repository: {
                select: {
                  organizationName: true,
                  tags: true,
                },
              },
            },
          },
        },
        orderBy: {
          lastRank: 'asc',
        },
        take: pageSize,
        skip: page * pageSize,
      }),
    ]);

    const contributorsForClient = contributors.map((contributor) => {
      const organizationNames = new Set<string>();
      const repositoryTags = new Set<string>();

      contributor.contributions.forEach((contribution) => {
        if (contribution.repository.organizationName) {
          organizationNames.add(contribution.repository.organizationName);
        }
        contribution.repository.tags.forEach((tag) => repositoryTags.add(tag));
      });

      return {
        contributorName: contributor.contributorName,
        totalCommits: contributor.totalCommits,
        followersCount: contributor.followersCount,
        lastReputationScore: contributor.lastReputationScore,
        lastRank: contributor.lastRank,
        organizationNames: Array.from(organizationNames),
        tags: Array.from(repositoryTags),
      };
    });

    return {
      count: countContributors,
      contributors: contributorsForClient,
    };
  }

  countContributors() {
    return this.prisma.contributor.count({
      where: {
        lastRank: {
          gte: 0,
        },
      },
    });
  }

  async getTotalTVE({ contributorName }: ContributorDto) {
    // Aggregate the sum of TVE for unique contract addresses linked to the contributor's repositories
    const result = await this.prisma.contract.aggregate({
      _sum: {
        tve: true,
      },
      where: {
        repository: {
          contributions: {
            some: {
              contributorName: {
                contains: contributorName,
                mode: 'insensitive',
              },
            },
          },
        },
      },
    });

    return result._sum.tve ?? 0;
  }

  async getAverageReputationScore({ contributorName }: ContributorDto) {
    const averageReputationScore = await this.prisma.contributor.aggregate({
      _avg: {
        lastReputationScore: true,
      },
      where: {
        contributorName: {
          contains: contributorName,
        },
      },
    });

    return averageReputationScore._avg.lastReputationScore ?? 0;
  }

  async getTotalCommits({ contributorName }: ContributorDto) {
    const commitsCountSum = await this.prisma.contributor.aggregate({
      _sum: {
        totalCommits: true,
      },
      where: {
        contributorName: {
          contains: contributorName,
        },
      },
    });

    return commitsCountSum._sum.totalCommits ?? 0;
  }

  async getReputationScoreHistoric({ contributorName }: ContributorDto) {
    const reputationHistory = await this.prisma.contributorReputation.findMany({
      where: {
        contributorName: {
          contains: contributorName,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return reputationHistory;
  }

  async getAttestations({ contributorName }: ContributorDto) {
    const attestation = await this.prisma.attestation.findMany({
      where: {
        contributorName: {
          startsWith: contributorName,
          mode: 'insensitive',
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return attestation.map((attestation) => ({
      ...attestation,
      time: attestation.time.toString(), // serialize a BigInt
      expirationTime: attestation.expirationTime.toString(), // serialize a BigInt
    }));
  }
}
