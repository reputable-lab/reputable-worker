import { BlockchainService } from '../blockchain/BlockchainService.js';
import { Metric } from '../metrics/MetricService.js';
import logger from '../utils/logger.js';
import { formatBlockNumber } from '../utils/utils.js';
import { BlockFetcher } from './types.js';

export class HistoricalSyncService {
  private blockchainService: BlockchainService;

  public metric: Metric;

  private blockFetcher: BlockFetcher;

  constructor({
    blockchainService,
    blockFetcher,
  }: {
    blockchainService: BlockchainService;
    blockFetcher: BlockFetcher;
  }) {
    this.blockchainService = blockchainService;
    this.blockFetcher = blockFetcher;
  }

  /**
   *
   * The source of truth is the local SQLite database not Prisma. Indeed to have the
   * nbOfUniqueTx, we need to register each wallet that have interacted with a contract to be able
   * to calculate this value. It's to big to be save on our prisma DB, that is why the source of truth
   * is SQLite. If SQLite is empty we need to begin from scratch event if there prisma have data on
   * many blocks.
   */
  public async initHistoricalSyncService() {
    const startBlock = Math.max(
      this.blockFetcher.startBlock || 0,
      this.blockchainService.getMinLastBlockStudied() + 1 // +1 because we should not studied again the same block
    );
    const logMessage =
      this.blockFetcher.startBlock &&
      this.blockFetcher.startBlock === startBlock
        ? `The service is asked to begin at block: ${formatBlockNumber(this.blockFetcher.startBlock)}, but will start at block: ${formatBlockNumber(startBlock)} due to no contract to watched before.`
        : `Start Block is: ${formatBlockNumber(startBlock)}`;
    logger.info(logMessage);

    // Quick win: In order to stay consistent with the other smart contracts
    // studied locally, we didn't go as far as the main block studied for the other SC.
    const endBlock =
      this.blockFetcher.endBlock ||
      Number(await this.blockchainService.getCurrentBlockNumber());
    logger.info(`Last Block will be: ${formatBlockNumber(endBlock)}`);

    this.blockFetcher = { ...this.blockFetcher, startBlock, endBlock };

    if (startBlock > endBlock) {
      logger.error(`Start block is greater than end block ❌`);
      await this.blockchainService.stopDataBaseService();
      process.exit(0);
    }

    this.metric = new Metric({
      totalBlockForFetching: endBlock,
      currentBlockForFetching: startBlock, // take into account the existing local storage (SQLite)
      totalBlockForProcessing: endBlock,
      currentBlockForProcessing: startBlock, // take into account the existing local storage (SQLite)
    });

    //LISTENER
    // Final prisma prisma backup
    this.metric.metricEventEmitter.on('finalPrismaBackup', () => {
      this.blockchainService.saveStateToPrisma();
    });

    // Catch when the service is stopped by the Dev when it was running
    process.on('SIGINT', async () => this.handleInterrupt());

    // Start the block processing worker
    this.startBlockProcessing();
  }

  private async handleInterrupt() {
    logger.info('Stopping Historical Sync Service...');
    await this.blockchainService.stopFetchingBlocks();

    // Wait for current block processing to finish or timeout after two minutes
    const timeout = 2 * 60 * 1000; // Two minutes in milliseconds
    const startTime = Date.now();

    await new Promise((resolve) => {
      const checkBlocksProcessed = () => {
        if (
          this.metric.getFetchBlockState().currentBlock ===
          this.metric.getProcessBlockState().currentBlock
        ) {
          logger.info('Last block fetched have been processed');
          resolve(undefined);
        } else if (Date.now() - startTime >= timeout) {
          logger.warn('Timeout reached. Exiting Historical Sync Service.');
          resolve(undefined); // Resolve to exit even if not fully processed
        } else {
          setTimeout(checkBlocksProcessed, 1000);
        }
      };

      checkBlocksProcessed(); // Start checking again
    });
    await this.blockchainService.stopDataBaseService({
      lastBlockProcessed: this.metric.getProcessBlockState().currentBlock,
    });
    logger.info('Historical Sync Service stopped.');
    process.exit(0); // Exit the process
  }

  private startBlockProcessing() {
    this.blockchainService.processBlock({ metric: this.metric });
  }

  startSync() {
    this.blockchainService.fetchBlocks({
      metric: this.metric,
      startBlock: this.blockFetcher.startBlock,
      endBlock: this.blockFetcher.endBlock,
      batchSize: this.blockFetcher.batchSize,
    });
  }
}
