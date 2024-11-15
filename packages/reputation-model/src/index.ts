import { CronJob } from 'cron';
import { reputationModel } from './reputationModel';
import logger from './utils/logger';

let jobIsRunning = false;
const jobFunction = async () => {
  if (jobIsRunning) {
    logger.error(
      'Attempted to start a job, but the previous job is still running.'
    );
    return;
  }

  try {
    jobIsRunning = true;
    logger.info('Job started');
    await reputationModel();
    logger.info('Job completed');
  } catch (error) {
    logger.error(
      `[jobFunction reputationModel] An error occurred during the job execution: ${error}`
    );
  } finally {
    jobIsRunning = false;
  }
};

// This pattern '0 0 */1 * * *' means "run every 1 hours"
new CronJob('0 0 */1 * * *', jobFunction, null, true, 'Europe/Paris');
