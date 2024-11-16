import { ParserMetrics } from '../parser/types.js';
import logger from '../utils/logger.js';

export class Metric {
  #parserState: ParserMetrics;

  constructor() {
    this.#parserState = {
      countNoRepoLink: 0,
      countNoSmartContractAddress: 0,
      countNoCreationBlockNumber: 0,
      countHasNoValidGithubEntity: 0,
    };
  }

  updateParserStateOnErrorForRepoLink({ row }: { row: any }) {
    this.#parserState.countNoRepoLink++;
    logger.error(
      `Error in parser for RepoLink on this row ${JSON.stringify(row)}`
    );
  }

  updateParserStateOnErrorForSmartContractAddress({ row }: { row: any }) {
    this.#parserState.countNoSmartContractAddress++;
    logger.error(
      `Error in parser for smart contract address on this row ${JSON.stringify(row)}`
    );
  }

  updateParserStateOnErrorForCreationBlockNumber({ row }: { row: any }) {
    this.#parserState.countNoCreationBlockNumber++;
    logger.error(
      `Error in parser for creation block number on this row ${JSON.stringify(row)}`
    );
  }

  updateParserStateOnErrorForGithubEntity({ row }: { row: any }) {
    this.#parserState.countHasNoValidGithubEntity++;
    logger.error(
      `Error in parser for Github entity check on this row ${JSON.stringify(row)}`
    );
  }
}
