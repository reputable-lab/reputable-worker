import { prisma } from '@reputable/data-warehouse';
import { octokit } from '../client';
import logger from '../utils/logger';

/**
 * Get the following data on an organization :
 * 1- Active Developers : Au moins un commit sur chacun des trois dernier mois.
 * 2- New Developers : Nouveaux contributeurs qui ont commit dans l'organisation pour la première fois au cours des 30 derniers jours.
 * 3- Unique Developers : Contributeurs qui n'ont pas commit dans une autre organisation au cours des 30 derniers jours mais ont commit dans l'organisation en question pendant cette période.
 *
 * @param repositories - An array of repository objects for which contributors are to be fetched.
 */

async function fetchCommitsForRepo({
  owner,
  repo,
  since,
}: {
  owner: string;
  repo: string;
  since: Date;
}) {
  try {
    return octokit.paginate(octokit.rest.repos.listCommits, {
      owner,
      repo,
      since: since.toISOString(),
    });
  } catch (error) {
    logger.error(
      `[fetchCommitsForRepo] Failed to fetch commits for ${owner}/${repo}: ${error.message}`
    );
    throw error;
  }
}

// Contributor should already been in the database as it a tracked repository
function trackCommitsByContributor(commits: any[], now: Date) {
  const commitsByContributor = new Map<string, number[]>();

  for (const commit of commits) {
    const commitDate = new Date(commit.commit.author.date);
    const contributorName = commit.author?.login;

    if (!contributorName) continue;

    // Ecart en mois entre la date actuelle et la date du commit (toujours un entier)
    const monthDiff =
      (now.getFullYear() - commitDate.getFullYear()) * 12 +
      (now.getMonth() - commitDate.getMonth());

    if (monthDiff < 3) {
      if (!commitsByContributor.has(contributorName)) {
        commitsByContributor.set(contributorName, Array(3).fill(0));
      }
      const monthlyCommits = commitsByContributor.get(contributorName);
      monthlyCommits[monthDiff]++;
    }
  }

  return commitsByContributor;
}

function getActiveDevelopers(commitsByContributor: Map<string, number[]>) {
  const activeDevelopers = new Set<string>();

  for (const [contributorName, monthlyCommits] of commitsByContributor) {
    if (monthlyCommits.every((commits) => commits > 0)) {
      activeDevelopers.add(contributorName);
    }
  }

  return activeDevelopers;
}

async function getUniqueContributors(
  orgName: string,
  oneMonthAgo: Date,
  contributorNames: Set<string>
) {
  const uniqueContributors = new Set<string>();

  for (const contributorName of contributorNames) {
    const otherOrgsCommits = await prisma.contribution.findMany({
      where: {
        contributorName,
        repository: {
          organizationName: { not: orgName },
        },
        lastCommitTimestamp: {
          gt: Math.floor(oneMonthAgo.getTime() / 1000), // Convert to seconds
        },
      },
    });

    if (otherOrgsCommits.length === 0) {
      uniqueContributors.add(contributorName);
    }
  }

  return uniqueContributors;
}

async function getNewContributors(
  orgName: string,
  oneMonthAgo: Date,
  contributorNames: Set<string>
) {
  const newContributors = new Set<string>();

  for (const contributorName of contributorNames) {
    const firstCommitInOrg = await prisma.contribution.findFirst({
      where: {
        contributorName,
        repository: {
          organizationName: orgName,
        },
      },
      orderBy: {
        lastCommitTimestamp: 'asc',
      },
    });

    if (
      firstCommitInOrg &&
      new Date(firstCommitInOrg.lastCommitTimestamp * 1000) > oneMonthAgo
    ) {
      newContributors.add(contributorName);
    }
  }

  return newContributors;
}

export async function calculateAndUpdateMetrics({
  organization: org,
  repositories,
}) {
  try {
    const orgName = org.organizationName;
    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Fetch all commits in parallel
    const commitPromises = repositories.map((repo) =>
      fetchCommitsForRepo({
        owner: repo.owner,
        repo: repo.name,
        since: threeMonthsAgo,
      })
    );

    const allCommitsArrays = await Promise.all(commitPromises);
    const allCommits = allCommitsArrays.flat(); // Flatten the array of arrays

    const commitsByContributor = trackCommitsByContributor(allCommits, now);
    const activeDevelopers = getActiveDevelopers(commitsByContributor);

    // Get unique and new contributors in parallel
    const [uniqueContributors, newContributors] = await Promise.all([
      getUniqueContributors(
        orgName,
        oneMonthAgo,
        new Set(commitsByContributor.keys())
      ),
      getNewContributors(
        orgName,
        oneMonthAgo,
        new Set(commitsByContributor.keys())
      ),
    ]);

    logger.info(`Updated metrics for organization: ${orgName}`);
    return {
      activeContributor: activeDevelopers.size,
      uniqueContributor: uniqueContributors.size,
      newContributor: newContributors.size,
    };
  } catch (error) {
    logger.error(`[calculateAndUpdateMetrics] Error: ${error}`);
    throw error;
  }
}
