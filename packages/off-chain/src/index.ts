import { CronJob } from 'cron';
import { offChain } from './offChain';
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
    await offChain();
    logger.info('Job completed');
  } catch (error) {
    logger.error(
      `[jobFunction off-chain] An error occurred during the job execution: ${error}`
    );
  } finally {
    jobIsRunning = false;
  }
};

// This pattern '0 0 8 * * *' means "run at 8:00:00 AM every day"
new CronJob('0 0 8 * * *', jobFunction, null, true, 'Europe/Paris');
