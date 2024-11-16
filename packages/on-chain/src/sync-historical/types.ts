import { Address } from 'viem';

export { Address, Block } from 'viem';

export type Tx = `0x${string}`;

export type BlockFetcher = {
  /**
   * If no start block is specified, the start block chosen will be the minimum
   * of the deployment block over all smart contract watched.
   */
  startBlock?: number;
  /**
   * If no start block is specified, the start block chosen will be
   * current block of the network when the script is launch.
   */
  endBlock?: number;
  batchSize: number;
};

export type Contract = {
  nbOfTx: number;
  uniqueAddressFrom: Set<Address>;
  totalTve: bigint;
};
