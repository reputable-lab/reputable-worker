import { request } from 'undici';
import 'dotenv/config';
import { isAddress } from 'viem';
import { normalize } from 'viem/ens';
import { client } from '../parser/client.js';
import logger from './logger.js';

export const getCreationBlockNumber = async (
  contractAddressOrENS: string
): Promise<number | null> => {
  let contractAddress = contractAddressOrENS;

  // Check if it's a valid Ethereum address or ENS name
  if (!isAddress(contractAddress, { strict: false })) {
    try {
      // Try to resolve ENS name to an Ethereum address
      contractAddress = await client.getEnsAddress({
        name: normalize(contractAddressOrENS),
      });
    } catch (error) {
      logger.error(
        `[getCreationBlockNumber] Invalid Ethereum address: ${contractAddressOrENS}`,
        error
      );
    }
  }

  if (!contractAddress) {
    logger.error(`Error invalid Contract Address ${contractAddressOrENS}`);
  }

  const url = `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${process.env.ETHERSCAN_API_KEY}`;

  try {
    const { body } = await request(url);
    const data: any = await body.json();

    if (data?.status === '1' && data?.result?.length > 0) {
      const txHash = data.result[0].txHash;
      logger.info(
        `txHash contract creation: ${txHash} for contract:${contractAddress}`
      );
      // Fetch the transaction details to get the block number using viem
      const txDetails = await client.getTransaction({ hash: txHash });
      return Number(txDetails?.blockNumber);
    }
  } catch (error) {
    logger.error(
      `[getCreationBlockNumber] Error fetching creation block number for address ${contractAddress}`,
      error
    );
  }

  return null;
};
