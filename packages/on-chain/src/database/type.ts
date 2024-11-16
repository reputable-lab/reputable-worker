import { Address } from 'viem';

export { Address } from 'viem';

export type Contract = {
  nbOfTx: number;
  totalTve: number;
  firstBlockStudied: number;
  lastBlockStudied: number;
};

export type Transactions = Record<
  Address,
  {
    txTVE: number;
    txFromAddresses: Set<Address>;
  }
>;
