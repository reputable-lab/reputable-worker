import {
  EAS,
  Offchain,
  OffchainAttestationVersion,
} from '@ethereum-attestation-service/eas-sdk';
import { Wallet, JsonRpcProvider } from 'ethers';
import { easContractAddress, chainId } from '../config/config';

export const initEAS = async () => {
  const sender = new Wallet(
    process.env.ETH_WALLET_PRIVATE_KEY,
    new JsonRpcProvider('https://sepolia.unichain.org')
  );
  const eas = new EAS(easContractAddress, { signer: sender });
  const offchain = new Offchain(
    {
      address: easContractAddress,
      version: await eas.getVersion(),
      chainId: BigInt(chainId),
    },
    OffchainAttestationVersion.Version2,
    eas
  );

  return {
    sender,
    offchain,
  };
};
