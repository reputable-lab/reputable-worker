import EventEmitter from 'events';
import { UiService } from '../ui/UiService.js';
import logger from '../utils/logger.js';
import { formatBlockNumber } from '../utils/utils.js';
import { FetchBlockState, ProcessBlockState } from './types.js';

export class Metric {
  private fetchBlockState: FetchBlockState;

  private processBlockState: ProcessBlockState;

  public metricEventEmitter: EventEmitter;

  public uiService: UiService;

  constructor({
    totalBlockForFetching,
    currentBlockForFetching,
    totalBlockForProcessing,
    currentBlockForProcessing,
  }: {
    totalBlockForFetching: number;
    currentBlockForFetching?: number;
    totalBlockForProcessing: number;
    currentBlockForProcessing?: number;
  }) {
    this.fetchBlockState = {
      totalBlocks: totalBlockForFetching,
      currentBlock: currentBlockForFetching || 0,
    };

    this.processBlockState = {
      totalBlocks: totalBlockForProcessing,
      currentBlock: currentBlockForProcessing || 0,
    };

    this.metricEventEmitter = new EventEmitter();
    this.setupListeners();

    // Create UiService instance
    // this.uiService = new UiService(this);
  }

  private setupListeners() {
    // Listener for updating fetch block state
    this.metricEventEmitter.on(
      'updateFetchBlockState',
      (numberOfBlocksFetched: number) => {
        this.fetchBlockState.currentBlock += numberOfBlocksFetched;
        logger.info(
          `Blocks Fetched: ${formatBlockNumber(this.fetchBlockState.currentBlock - 1)} / ${formatBlockNumber(this.fetchBlockState.totalBlocks)}`
        );
      }
    );

    // Listener for updating process block state
    this.metricEventEmitter.on(
      'updateProcessBlockState',
      (numberOfBlocksProcessed: number) => {
        this.processBlockState.currentBlock += numberOfBlocksProcessed;
        logger.info(
          `Blocks processed: ${formatBlockNumber(this.processBlockState.currentBlock - 1)} / ${formatBlockNumber(this.processBlockState.totalBlocks)}`
        );
        this.checkIfComplete();
      }
    );
  }

  private checkIfComplete() {
    if (
      this.fetchBlockState.currentBlock >= this.fetchBlockState.totalBlocks &&
      this.processBlockState.currentBlock >= this.processBlockState.totalBlocks
    ) {
      // this.uiService.kill();
      this.emitFinalPrismaBackup();
    }
  }

  /**
   * Get the current state of block fetching.
   * @returns Fetch block state.
   */
  getFetchBlockState() {
    return { ...this.fetchBlockState };
  }

  /**
   * Get the current state of block processing.
   * @returns Process block state.
   */
  getProcessBlockState() {
    return { ...this.processBlockState };
  }

  /**
   * Emit an event to update fetch block state.
   */
  emitFetchBlockUpdate(numberOfBlocksFetched: number) {
    this.metricEventEmitter.emit(
      'updateFetchBlockState',
      numberOfBlocksFetched
    );
  }

  /**
   * Emit an event to update process block state.
   */
  emitProcessBlockUpdate(numberOfBlocksProcessed: number) {
    this.metricEventEmitter.emit(
      'updateProcessBlockState',
      numberOfBlocksProcessed
    );
  }

  emitFinalPrismaBackup() {
    this.metricEventEmitter.emit('finalPrismaBackup');
  }
}
