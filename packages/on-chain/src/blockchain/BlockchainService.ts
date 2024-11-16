import EventEmitter from 'events';
import path from 'path';
import { loadBalance } from '@ponder/utils';
import PQueue from 'p-queue';
import { Address, createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { DatabaseService } from '../database/DatabaseService.js';
import { Transactions } from '../database/type.js';
import { env } from '../env.js';
import { Metric } from '../metrics/MetricService.js';
import logger from '../utils/logger.js';
import { convertToETH } from '../utils/utils.js';
import { RPC_TENDERLY } from './config/config.js';
import { ethGetBatchBlockByNumber } from './rpc.js';
import { CheckpointConfig } from './type.js';

export class BlockchainService extends DatabaseService {
  #client;

  #blockQueue: PQueue<any>;

  public blockEventEmitter: EventEmitter;

  readonly #checkpoint: CheckpointConfig;

  private stoppingFetching: boolean = false;

  /**
   *
   * @param param0 each checkpointNumber blocks, a prisma backup will be triggered
   */
  constructor({ checkpointNumber }: { checkpointNumber: number }) {
    const nodeEnv = process.env.NODE_ENV == 'prod' ? 'prod' : 'dev';
    const dbPath = path.join(
      './src/database/sqlite',
      `localState.internalDatabase-${nodeEnv}`
    );
    super(dbPath);
    this.#blockQueue = new PQueue({
      concurrency: 6, // should correspond to the nb of RPC bellow
    });
    this.blockEventEmitter = new EventEmitter();
    this.#client = this.initBlockchainService();
    this.#checkpoint = {
      blockProcessed: 0,
      checkpointNumber,
    };

    //Each time a new block is pro we achieve a check point and we save the SQLITE state into prisma
    this.blockEventEmitter.on('newBlocks', this.isCheckpointBackup);
  }

  private initBlockchainService() {
    return createPublicClient({
      chain: mainnet,
      transport: loadBalance([
        http(`${RPC_TENDERLY}${env.TENDERLY_RPC_API_KEY_1}`, {
          batch: true,
          retryCount: 10,
        }),

        http(`${RPC_TENDERLY}${env.TENDERLY_RPC_API_KEY_2}`, {
          batch: true,
          retryCount: 10,
        }),

        http(`${RPC_TENDERLY}${env.TENDERLY_RPC_API_KEY_3}`, {
          batch: true,
          retryCount: 10,
        }),

        http(`${RPC_TENDERLY}${env.TENDERLY_RPC_API_KEY_4}`, {
          batch: true,
          retryCount: 10,
        }),

        http(`${RPC_TENDERLY}${env.TENDERLY_RPC_API_KEY_5}`, {
          batch: true,
          retryCount: 10,
        }),

        http(`${RPC_TENDERLY}${env.TENDERLY_RPC_API_KEY_6}`, {
          batch: true,
          retryCount: 10,
        }),
      ]),
    });
  }

  async stopFetchingBlocks() {
    this.stoppingFetching = true;
  }

  //TODO: add checkpoint info in metric class
  private isCheckpointBackup = async (blocks: any[]) => {
    this.#checkpoint.blockProcessed += blocks.length;
    if (this.#checkpoint.blockProcessed >= this.#checkpoint.checkpointNumber) {
      this.#checkpoint.blockProcessed = 0; // Reset the block count after saving
      await this.saveStateToPrisma();
    }
  };

  /**
   * Emit an event to update fetch block state.
   */
  private emitNewBlocksFetched({ blocks }: { blocks: any[] }) {
    this.blockEventEmitter.emit('newBlocks', blocks);
  }

  getCurrentBlockNumber = async (): Promise<bigint> => {
    return this.#client.getBlockNumber();
  };

  processBlock({ metric }: { metric: Metric }) {
    this.blockEventEmitter.on('newBlocks', async (blocks: any[]) => {
      try {
        const transactionsToStore: Transactions = {};

        for (const block of blocks) {
          const currentBlockNumber = Number(block.number);

          // Retrieve contract addresses to watch for the current block
          const contractAddressList: Address[] =
            await this.getContractsToWatch(currentBlockNumber);
          for (const tx of block.transactions) {
            // Filter out some txs we know will not be of interest for us
            if (!tx.to || !tx.input || tx.input === '0x') {
              continue;
            }

            const contractAddress: Address = tx.to.toLowerCase();
            if (!contractAddressList.includes(contractAddress)) {
              continue;
            }

            const txTVE = convertToETH(tx.value);
            if (!transactionsToStore[contractAddress]) {
              transactionsToStore[contractAddress] = {
                txTVE: 0,
                txFromAddresses: new Set<Address>(),
              };
            }
            transactionsToStore[contractAddress].txTVE += txTVE;
            transactionsToStore[contractAddress].txFromAddresses.add(
              tx.from.toLowerCase() as Address
            );
          }
        }

        // Emit event to store transactions after processing all blocks
        const lastBlockStudied = Number(blocks[blocks.length - 1].number);
        this.emitDatabaseBackup(lastBlockStudied, transactionsToStore);
        // Update metric for processing block
        metric.emitProcessBlockUpdate(blocks.length);
      } catch (error) {
        logger.error(`[startBlockProcessing] error: ${error.message}`);
      }
    });
  }

  fetchBlocks = async ({
    metric,
    startBlock,
    endBlock,
    batchSize,
  }: {
    metric: Metric;
    startBlock: number;
    endBlock: number;
    batchSize: number;
  }) => {
    try {
      for (
        let currentBlock = startBlock;
        currentBlock <= endBlock && !this.stoppingFetching;
        currentBlock += batchSize
      ) {
        const endBatchBlock = Math.min(currentBlock + batchSize - 1, endBlock);

        // Create a new scope for each iteration
        await this.#blockQueue.add(async () => {
          try {
            const blocks = await ethGetBatchBlockByNumber({
              client: this.#client,
              startBlock: currentBlock,
              endBlock: endBatchBlock,
            });

            this.emitNewBlocksFetched({ blocks });
            metric.emitFetchBlockUpdate(blocks.length);
          } catch (error) {
            logger.error(
              `[fetchBlocks] Error fetching blocks: ${error.message}`
            );
            // Handle error, possibly retry or continue with the next batch
          }
        });
      }

      // Wait for the queue to empty
      await this.#blockQueue.onEmpty();

      logger.info('Block fetching completed.');
    } catch (error) {
      logger.error(`[fetchBlocks] Unexpected error: ${error.message}`);
    }
  };
}
