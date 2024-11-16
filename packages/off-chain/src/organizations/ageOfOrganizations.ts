import logger from '../utils/logger';

export function setAgeForOrganizations({ organizationName, oldestRepo }) {
  try {
    if (!oldestRepo) {
      logger.warn(
        `No repositories found for organization: ${organizationName}`
      );
      return;
    }

    const oldestCommitTimestamp = oldestRepo.firstCommits;

    // Update the organization's firstCommit field in the database
    return {
      firstCommit: oldestCommitTimestamp,
    };
  } catch (error) {
    logger.error(`[setFirstCommitForOrganization] Error: ${error}`);
    throw error;
  }
}
