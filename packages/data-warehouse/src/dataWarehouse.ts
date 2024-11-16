import { ParserService } from './parser/ParserService.js';
import logger from './utils/logger.js';

export const DataWarehouse = async () => {
  try {
    // const csvFile = 'newRepo.csv';
    const csvFile =
      process.env.NODE_ENV === 'dev' ? 'test.csv' : 'reputable.csv';
    const processor = new ParserService({
      filePath: `./src/csvFile/${csvFile}`,
    });
    processor.start();
  } catch (error) {
    logger.error(`[DataWarehouse] Error: ${error}`);
  }
};

DataWarehouse().catch((error) => {
  logger.error(error);
  process.exitCode = 1;
});
