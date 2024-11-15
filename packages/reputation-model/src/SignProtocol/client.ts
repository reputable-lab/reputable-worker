import { SignProtocolClient, SpMode, OffChainSignType } from '@ethsign/sp-sdk';
import { Wallet, JsonRpcProvider } from 'ethers';
import { privateKeyToAccount } from 'viem/accounts';
import logger from '../utils/logger';

export const initSignProtocol = async () => {
  const privateKey = process.env.ETH_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    logger.error(
      'ETH_WALLET_PRIVATE_KEY is not set in the environment variables'
    );
  }

  const provider = new JsonRpcProvider('https://sepolia.unichain.org');
  const sender = new Wallet(privateKey, provider);

  const client = new SignProtocolClient(SpMode.OffChain, {
    signType: OffChainSignType.EvmEip712,
    account: privateKeyToAccount(
      ('0x' + process.env.ETH_WALLET_PRIVATE_KEY) as any
    ),
  });
  return {
    sender,
    client,
  };
};
