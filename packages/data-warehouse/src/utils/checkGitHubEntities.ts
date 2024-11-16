import { LRUCache } from 'lru-cache';
import { octokit } from '../parser/client.js';
import { GithubEntity } from '../parser/types.js';

const cache = new LRUCache<string, GithubEntity>({
  max: 500, // Maximum number of items in the cache
  ttl: 1000 * 60 * 60, // Cache TTL of 1 hour (in milliseconds)
});

export const checkGitHubEntities = async ({
  repoOwner,
  repoName,
}): Promise<GithubEntity> => {
  const cacheKey = `${repoOwner}:${repoName}`;

  // Check if the result is already in the cache
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    const repoResponse = await octokit.rest.repos.get({
      owner: repoOwner,
      repo: repoName,
    });

    const result: GithubEntity = {
      organizationName: repoResponse.data?.organization?.login,
      repoOwner: repoResponse.data?.owner?.login,
      repoName: repoResponse.data?.name,
    };

    // Store the result in the cache
    cache.set(cacheKey, result);

    return result;
  } catch (error) {
    throw new Error(
      `[checkGitHubEntities] Error while entity verification: ${error.message}`
    );
  }
};
