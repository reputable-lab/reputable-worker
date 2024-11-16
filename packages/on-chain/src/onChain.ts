import { BlockchainService } from './blockchain/BlockchainService.js';
import { HistoricalSyncService } from './sync-historical/HistoricalSyncService.js';
import { BlockFetcher } from './sync-historical/types.js';
import logger from './utils/logger.js';

export const onChain = async () => {
  try {
    logger.info(`[onChain] 🎧 On-Chain service started`);

    const blockchainService = new BlockchainService({
      checkpointNumber: 1_000_000,
    });

    // TODO: How to handle async function in the constructor
    await blockchainService.initDatabaseService();

    const blockFetcher: BlockFetcher = {
      batchSize: 100, // 100 is the maximum batchSize accepted by RPC
    };
    const historicalService = new HistoricalSyncService({
      blockchainService,
      blockFetcher,
    });
    await historicalService.initHistoricalSyncService();
    historicalService.startSync();
  } catch (error) {
    logger.error(`[onChain] Error: ${error}`);
    throw error;
  }
};

onChain().catch((error) => {
  logger.error(error);
  process.exitCode = 1;
});
