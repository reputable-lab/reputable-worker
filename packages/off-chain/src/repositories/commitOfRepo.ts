import { prisma } from '@reputable/data-warehouse';
import { octokit } from '../client';
import logger from '../utils/logger';

export const getRepositoryCreationDate = async ({
  repoId,
  repoOwner,
  repoName,
}) => {
  try {
    const repoDetails = await octokit.rest.repos.get({
      owner: repoOwner,
      repo: repoName,
    });

    const creationDate = new Date(repoDetails.data.created_at);
    const creationTimestamp = Math.floor(creationDate.getTime() / 1000);

    // Update the repository record in the database with the first commit timestamp
    await prisma.repository.update({
      where: { repositoryId: repoId },
      data: { firstCommits: creationTimestamp },
    });
  } catch (error) {
    logger.error(
      `[getRepositoryCreationDate] Error fetching the first commit of a repository: ${repoName}:`,
      error
    );
  }
};

export const getLastCommitOfContributorForRepo = async ({
  repoOwner,
  repoName,
  contributor,
}) => {
  try {
    const commitsResponse = await octokit.rest.repos.listCommits({
      owner: repoOwner,
      repo: repoName,
      author: contributor,
      per_page: 1, // Only fetch the latest commit
      order: 'desc',
    });

    // it seems to means that it was not a direct contribution on master branch but an indirect one
    // ex: a merge of master into branch_x
    if (!commitsResponse.data[0]) {
      return {};
    }
    const lastCommitTimestamp =
      new Date(commitsResponse.data[0].commit.committer.date).getTime() / 1000; // Convert to seconds
    return { lastCommitTimestamp };
  } catch (error) {
    logger.error(
      `[getLastCommitOfContributorForRepo] Error fetching last commit timestamp for : ${contributor} for repository: ${repoName}`,
      error
    );
  }
};
