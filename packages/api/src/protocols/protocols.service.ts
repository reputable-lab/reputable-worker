import { Injectable } from '@nestjs/common';
import { Prisma } from '@reputable/data-warehouse';
import { PrismaService } from '../prisma/prisma.service';
import {
  OrganizationsDto,
  RequireProtocolDto,
  ProtocolDto,
} from './protocol.dto';

@Injectable()
export class ProtocolsService {
  constructor(private prisma: PrismaService) {}

  async getOrganizations({
    protocolName,
    tag,
    hasAllTags,
    page,
    pageSize,
  }: OrganizationsDto) {
    const organizationsWhere: Prisma.OrganizationWhereInput = {
      organizationName: {
        contains: protocolName,
        mode: 'insensitive',
      },
      ...(tag && {
        repositories: {
          some: {
            tags: {
              has: tag,
            },
          },
        },
      }),
      ...(hasAllTags && {
        repositories: {
          some: {
            tags: {
              hasEvery: hasAllTags,
            },
          },
        },
      }),
    };

    const [countOrganizations, organizations] = await Promise.all([
      this.prisma.organization.count({
        where: organizationsWhere,
      }),
      this.prisma.organization.findMany({
        where: organizationsWhere,
        orderBy: {
          lastRank: 'asc',
        },
        take: pageSize,
        skip: page * pageSize,
        include: {
          repositories: {
            select: {
              tags: true,
            },
          },
        },
      }),
    ]);

    // Flatten the tags from the repositories into a single array for each organization
    const organizationsWithTags = organizations.map((org) => {
      const allTags = new Set<string>();
      org.repositories.forEach((repo) => {
        repo.tags.forEach((tag) => allTags.add(tag));
      });
      return {
        ...org,
        tags: Array.from(allTags),
        repositories: undefined, // Remove the repositories field
      };
    });

    return {
      count: countOrganizations,
      organizations: organizationsWithTags,
    };
  }

  async getTotalTVE({ protocolName }: ProtocolDto) {
    const totalTVE = await this.prisma.contract.aggregate({
      _sum: {
        tve: true,
      },
      where: {
        repository: {
          organization: {
            organizationName: {
              contains: protocolName,
              mode: 'insensitive',
            },
          },
        },
      },
    });

    return totalTVE._sum?.tve || 0;
  }

  async getTotalCommits({ protocolName }: ProtocolDto) {
    const organizations = await this.prisma.organization.findMany({
      where: {
        organizationName: {
          contains: protocolName,
          mode: 'insensitive',
        },
      },
      select: {
        repositories: {
          select: {
            totalCommits: true,
          },
        },
      },
    });

    const totalCommits = organizations.reduce((sum, organization) => {
      const organizationCommits = organization.repositories.reduce(
        (orgSum, repo) => orgSum + repo.totalCommits,
        0
      );
      return sum + organizationCommits;
    }, 0);

    return totalCommits;
  }

  async getRepositories({ protocolName }: ProtocolDto) {
    const organization = await this.prisma.organization.findMany({
      where: {
        organizationName: {
          contains: protocolName,
          mode: 'insensitive',
        },
      },
      include: {
        repositories: true,
      },
    });

    return organization;
  }

  async getMostRecentDevelopers({
    protocolName,
    page,
    pageSize,
  }: RequireProtocolDto) {
    const offset = (page - 1) * pageSize;

    const recentDevelopers = await this.prisma.$queryRawUnsafe(`
      SELECT "Contributor"."contributorName", "lastCommitTimestamp", "Repository"."name" as "lastRepositoryName", "Contributor"."lastReputationScore" 
      FROM (
        SELECT DISTINCT ON ("contributorName") *
        FROM "Contribution"
        WHERE "repositoryId" IN (
          SELECT "repositoryId"
          FROM "Repository"
          WHERE "organizationName" = '${protocolName}'
        )
        ORDER BY "contributorName", "lastCommitTimestamp" DESC
      ) AS subquery
      JOIN "Contributor" on "Contributor"."contributorName" = subquery."contributorName"
      JOIN "Repository" on "Repository"."repositoryId" = subquery."repositoryId"
      ORDER BY "lastCommitTimestamp" DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    ;`);

    return recentDevelopers;
  }

  async getDevelopersWithTheMostCommits({
    protocolName,
    page,
    pageSize,
  }: RequireProtocolDto) {
    const offset = (page - 1) * pageSize;

    const developersWithTheMostCommits = await this.prisma.$queryRawUnsafe(`
      SELECT 
          "Contributor"."contributorName", 
          "lastCommitTimestamp",
          "Contributor"."lastReputationScore",
          CAST(total_commits."totalCommitsCount" AS INTEGER)
      FROM (
          SELECT DISTINCT ON ("contributorName") *
          FROM "Contribution"
          WHERE "repositoryId" IN (
              SELECT "repositoryId"
              FROM "Repository"
              WHERE "organizationName" = '${protocolName}'
          )
          ORDER BY "contributorName", "lastCommitTimestamp" DESC
      ) AS distinct_contributors
      JOIN "Contributor" ON "Contributor"."contributorName" = distinct_contributors."contributorName"
      LEFT JOIN (
          SELECT "contributorName", SUM("commitsCount") as "totalCommitsCount"
          FROM "Contribution"
          GROUP BY "contributorName"
      ) AS total_commits ON total_commits."contributorName" = "Contributor"."contributorName"
      ORDER BY total_commits."totalCommitsCount" DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    ;`);

    return developersWithTheMostCommits;
  }

  async getChurningDevelopers({
    protocolName,
    page,
    pageSize,
  }: RequireProtocolDto) {
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;

    // Fetch recent contributors who committed in the last 30 days in the current organization
    const recentContributors = await this.prisma.contribution.findMany({
      where: {
        repository: {
          organizationName: protocolName,
        },
        lastCommitTimestamp: {
          gt: thirtyDaysAgo,
        },
      },
      distinct: ['contributorName'],
      orderBy: {
        lastCommitTimestamp: 'desc',
      },
      take: pageSize,
      skip: page * pageSize,
      select: {
        contributorName: true,
        lastCommitTimestamp: true,
        contributor: {
          select: {
            lastReputationScore: true,
          },
        },
      },
    });

    const contributorNames = recentContributors.map((c) => c.contributorName);

    // Fetch contributors who stopped contributing to other repositories more than 30 days ago
    const churningContributors = await this.prisma.contribution.findMany({
      where: {
        contributorName: {
          in: contributorNames,
        },
        lastCommitTimestamp: {
          lte: thirtyDaysAgo,
        },
        repository: {
          organizationName: {
            not: protocolName,
          },
        },
      },
      distinct: ['contributorName'],
      select: {
        contributorName: true,
        repository: {
          select: {
            name: true,
            organizationName: true,
          },
        },
      },
    });

    const churningContributorNames = new Set(
      churningContributors.map((c) => c.contributorName)
    );
    const filteredContributors = recentContributors.filter((c) =>
      churningContributorNames.has(c.contributorName)
    );

    // Combine the results to get previous repository names
    const finalResults = filteredContributors.map((contributor) => {
      const previousRepos = churningContributors
        .filter((c) => c.contributorName === contributor.contributorName)
        .map((c) => c.repository);

      return {
        contributorName: contributor.contributorName,
        lastCommitTimestamp: contributor.lastCommitTimestamp,
        lastReputationScore: contributor.contributor.lastReputationScore,
        previousRepositories: previousRepos,
        movedTo: protocolName,
      };
    });

    return finalResults;
  }

  async getReputationScoreHistoric({
    protocolName,
  }: {
    protocolName?: string;
  }) {
    const reputationHistory = await this.prisma.organizationReputation.findMany(
      {
        where: {
          organizationName: {
            contains: protocolName,
            mode: 'insensitive',
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }
    );

    return reputationHistory;
  }

  async getAverageReputationScore({ protocolName }: ProtocolDto) {
    const averageReputation = await this.prisma.organization.aggregate({
      where: {
        organizationName: {
          contains: protocolName,
          mode: 'insensitive',
        },
      },
      _avg: {
        lastReputationScore: true,
      },
    });

    return averageReputation._avg.lastReputationScore;
  }

  async getLastCommitTimestamp({ contributorName, protocolName }: ProtocolDto) {
    const contributions = await this.prisma.contribution.findMany({
      where: {
        contributorName: {
          contains: contributorName,
          mode: 'insensitive',
        },
        repository: {
          organizationName: {
            contains: protocolName,
            mode: 'insensitive',
          },
        },
      },
      select: {
        contributorName: true,
        lastCommitTimestamp: true,
        repository: {
          select: {
            organizationName: true,
          },
        },
      },
      orderBy: {
        lastCommitTimestamp: 'desc',
      },
    });

    const result = contributions.reduce((acc, contribution) => {
      const organizationName = contribution.repository.organizationName;
      if (!acc[organizationName]) {
        acc[organizationName] = [];
      }
      acc[organizationName].push({
        contributorName: contribution.contributorName,
        lastCommitTimestamp: contribution.lastCommitTimestamp,
      });
      return acc;
    }, {});

    return result;
  }

  async getOrgsWithSharedDevs({ protocolName }: ProtocolDto) {
    const orgsWithSharedDevs = await this.prisma.$queryRawUnsafe(`
      SELECT "organizationName", "firstCommit", "numberOfRepos", "numberOfDevs", "numberOfCommits", "lastRank", "lastReputationScore", "activeContributor", "newContributor", "uniqueContributor" 
      FROM "Organization"
      WHERE "organizationName" in (
        SELECT DISTINCT repo."organizationName"
        FROM "Contribution" contr
        JOIN "Repository" repo ON repo."repositoryId" = contr."repositoryId"
        WHERE "contributorName" in (
          SELECT DISTINCT "contributorName"
          FROM "Contribution" cont
          JOIN "Repository" repo ON repo."repositoryId" = cont."repositoryId"
          WHERE repo."organizationName" = '${protocolName}'
        )
      )
      ORDER BY "lastRank" ASC
    ;`);

    return orgsWithSharedDevs;
  }

  async getUniqueTags({ protocolName }: ProtocolDto) {
    const repositories = await this.prisma.repository.findMany({
      where: {
        organization: {
          organizationName: {
            contains: protocolName,
            mode: 'insensitive',
          },
        },
      },
      select: {
        tags: true,
      },
    });

    const uniqueTags = [...new Set(repositories.flatMap((repo) => repo.tags))];
    return uniqueTags;
  }
}
