import { octokit } from '../client';
import logger from '../utils/logger';

export async function updateFollowersNumberForContributors({ contributor }) {
  try {
    const { data: user } = await octokit.rest.users.getByUsername({
      username: contributor.contributorName,
    });

    return { contributorFollowersCount: user.followers };
  } catch (error) {
    logger.error(
      `[updateFollowersNumberForContributors] Error fetching followers for ${contributor.contributorName}: ${error}`
    );
  }
}
