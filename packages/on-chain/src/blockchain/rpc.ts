import logger from '../utils/logger.js';

/**
 * Fetches blocks within a specified range.
 */
export async function ethGetBatchBlockByNumber({
  client,
  startBlock,
  endBlock,
}: {
  client: any;
  startBlock: number;
  endBlock: number;
}): Promise<any[]> {
  try {
    const promises: Array<Promise<any>> = [];
    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
      promises.push(
        client.getBlock({
          blockNumber: blockNumber,
          includeTransactions: true,
        })
      );
    }
    return await Promise.all(promises);
  } catch (error) {
    logger.error(`[eth_GetBatchBlockByNumber] error: ${error.message}`);
    throw error;
  }
}
