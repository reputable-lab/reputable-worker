import 'dotenv/config';
import { prisma } from '@reputable/data-warehouse';
import { initEAS } from './EAS/client';
import { initSignProtocol } from './SignProtocol/client';
import {
  computeReputationScoresForContributor,
  updateContributorRanks,
} from './singleFunctions/contributorsReputation';
import {
  computeReputationScoresForOrganizations,
  updateOrganizationRanks,
} from './singleFunctions/organizationsReputation';
import logger from './utils/logger';

export const reputationModel = async () => {
  try {
    // start a timer
    logger.profile('Reputation-Model');

    const cronRun = await prisma.cronRun.create({
      data: {
        cronType: 'reputationModel',
        finishAt: null,
      },
    });

    const { sender, client } = await initSignProtocol();
    logger.info('-> 1/4 - computeReputationScores()');
    await computeReputationScoresForContributor({ sender, client });

    logger.info('-> 2/4 - computeReputationScoresForOrganizations()');
    await computeReputationScoresForOrganizations();

    logger.info('-> 3/4 - updateContributorRanks()');
    logger.info('-> 4/4 - updateOrganizationRanks()');
    await Promise.all([updateContributorRanks(), updateOrganizationRanks()]);

    // Update the cron run record
    await prisma.cronRun.update({
      where: { id: cronRun.id },
      data: {
        finishAt: new Date(),
      },
    });
  } catch (error) {
    logger.error(`[reputationModel] Fatal error: ${error}`);
  } finally {
    // End the timer and log the duration
    logger.profile('Reputation-Model');
  }
};

reputationModel().catch((error) => {
  logger.error(error);
  process.exitCode = 1;
});
