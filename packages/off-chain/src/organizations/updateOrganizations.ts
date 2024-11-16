import { prisma } from '@reputable/data-warehouse';
import logger from '../utils/logger';

export async function countWeb3RepositoriesFromOrg({
  organizationName,
  repositories,
}) {
  try {
    const repositoryIds = repositories.map((repo) => repo.repositoryId);

    // Count total commits and unique contributors using groupBy
    const contributionsSummary = await prisma.contribution.groupBy({
      by: ['contributorName'],
      where: {
        repositoryId: {
          in: repositoryIds,
        },
      },
      _sum: {
        commitsCount: true,
      },
    });

    const totalCommits = contributionsSummary.reduce(
      (acc, curr) => acc + curr._sum.commitsCount,
      0
    );
    const totalOrgContributors = contributionsSummary.length;

    logger.info(
      `Updated org ${organizationName} with ${repositories.length} repos, ${totalCommits} commits, and ${totalOrgContributors} contributors.`
    );

    // Update the organization's fields
    return {
      numberOfRepos: repositories.length,
      numberOfCommits: totalCommits,
      numberOfDevs: totalOrgContributors,
    };
  } catch (error) {
    logger.error(`[countWeb3RepositoriesFromOrg] Error: ${error}`);
    throw error;
  }
}
