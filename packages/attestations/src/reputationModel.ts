import 'dotenv/config';
import { prisma } from '@reputable/data-warehouse';
import { initSignProtocol } from './SignProtocol/client';
import {
  createAndPublishAttestation,
} from './singleFunctions/contributorsReputation';
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
    await createAndPublishAttestation({ sender, client });

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
