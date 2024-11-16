import { PrismaClient, Prisma } from '@prisma/client';
import { octokit } from '../client.js';
import {
  getRepositoryCreationDate,
  getLastCommitOfContributorForRepo,
} from '../repositories/commitOfRepo.js';
import logger from '../utils/logger.js';
import { updateFollowersNumberForContributors } from './fetchFollowers.js';

const prisma = new PrismaClient();

/**
 * Fetches contributors for a list of repositories from the Github Rest API and updates the database.
 * This function iterates over each repository in the provided list, fetching contributor data
 * by calling the `fetchContributorsByRepository` function for each one.
 *
 * @param repositories - An array of repository objects for which contributors are to be fetched.
 */
export async function fetchContributorsAndTheirContributionsForAllRepository(
  repositories: Prisma.RepositoryCreateInput[]
) {
  // Handle repos one by one
  for (const [index, repo] of repositories.entries()) {
    logger.info(`Handling repo ${index + 1} / ${repositories.length}`);
    try {
      await fetchContributorsAndTheirContributionByRepository(repo);
    } catch (error) {
      logger.error(
        `[fetchContributorsAndTheirContributionsForAllRepository] Error fetching contributors for ${repo.name}: ${error}`
      );
    }
  }
}

/**
 * Fetches and updates contributor data for a single repository from the Github Rest API. This function
 * queries the API for contributors to a specific repository, handling pagination to retrieve all
 * contributors if the data spans multiple pages. It filters out bot contributors and aggregates
 * commit counts for each contributor. After fetching the data, it updates the total commit count
 * for the repository and Upsert each contributor's data in the database.
 * This process ensures that the database reflects the most current state of contributor activity
 * for the repository.
 *
 * @param repository - The repository object for which contributors are being fetched, containing
 * necessary identifiers like name and owner.
 */
export async function fetchContributorsAndTheirContributionByRepository(
  repository: Prisma.RepositoryCreateManyInput
): Promise<void> {
  try {
    logger.info(
      `Fetching contributors for repository: ${repository.owner}/${repository.name}`
    );

    await getRepositoryCreationDate({
      repoId: repository.repositoryId,
      repoOwner: repository.owner,
      repoName: repository.name,
    });

    // Use octokit.paginate to automatically iterate through all pages
    // Warning => To improve performance, only the first 500 author email addresses in the repository link to GitHub users. The rest will appear as anonymous contributors without associated GitHub user information.
    const repoContributors = await octokit.paginate(
      octokit.rest.repos.listContributors,
      {
        owner: repository.owner,
        repo: repository.name,
      }
    );

    const contributors = [];
    // Process each contributor
    for (const contributor of repoContributors) {
      // remove bots commit
      if (contributor.login?.includes('[bot]')) {
        continue;
      }

      const { lastCommitTimestamp } = await getLastCommitOfContributorForRepo({
        repoOwner: repository.owner,
        repoName: repository.name,
        contributor: contributor.login,
      });
      if (!lastCommitTimestamp) {
        continue;
      }
      contributors.push({
        contributorName: contributor.login,
        totalCommits: contributor.contributions,
        lastCommitTimestamp,
      });
    }

    // Calculate total commits for the contributor for the current process repository
    const totalCommitsForRepo = contributors.reduce(
      (sum, contributor) => sum + contributor.totalCommits,
      0
    );

    // Update totalCommit for the repository in the database
    await prisma.repository.update({
      where: { repositoryId: repository.repositoryId },
      data: { totalCommits: totalCommitsForRepo },
    });

    // Upsert contributors and create or update Contribution records
    for (const contributor of contributors) {
      const { contributorFollowersCount } =
        await updateFollowersNumberForContributors({
          contributor,
        });

      // Update contributor : the field totalCommits by contributor will be filled automatically later
      await prisma.contributor.upsert({
        where: { contributorName: contributor.contributorName },
        update: {},
        create: {
          contributorName: contributor.contributorName,
          followersCount: contributorFollowersCount,
        },
      });

      // Create or update Contribution records
      await prisma.contribution.upsert({
        where: {
          contributorName_repositoryId: {
            contributorName: contributor.contributorName,
            repositoryId: repository.repositoryId,
          },
        },
        update: {
          commitsCount: contributor.totalCommits,
          lastCommitTimestamp: contributor.lastCommitTimestamp,
        },
        create: {
          contributorName: contributor.contributorName,
          repositoryId: repository.repositoryId,
          commitsCount: contributor.totalCommits,
          lastCommitTimestamp: contributor.lastCommitTimestamp,
        },
      });
    }
  } catch (error) {
    logger.error(
      `[fetchContributorsAndTheirContributionByRepository] Error fetching contributors for repositoryId: ${repository.repositoryId}:`,
      error.message
    );
  }
}

/**
 * Updates the total commits for each contributor. This function should be execute when the database is
 * entirely filled.
 */
export function updateContributorsTotalCommits({ contributor }) {
  try {
    const totalCommits = contributor.contributions.reduce(
      (sum, contribution) => sum + contribution.commitsCount,
      0
    );

    return { totalCommits };
  } catch (error) {
    logger.error(
      `[updateContributorsTotalCommits] Error updating total commits for ${contributor.contributorName}: ${error}`
    );
    throw error; // Throw error to handle it in the transaction
  }
}
