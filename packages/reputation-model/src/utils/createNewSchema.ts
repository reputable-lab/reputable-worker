import {
  SchemaRegistry,
  ZERO_ADDRESS,
} from '@ethereum-attestation-service/eas-sdk';
import { JsonRpcProvider, Wallet } from 'ethers';
import { easSchemaRegistryContractAddress, schema } from '../config/config';
import logger from './logger';

export default async function main() {
  const wallet = new Wallet(
    process.env.ETH_WALLET_PRIVATE_KEY,
    new JsonRpcProvider('https://sepolia.unichain.org')
  );
  const registry = new SchemaRegistry(easSchemaRegistryContractAddress, {
    signer: wallet,
  });
  const tx = await registry.register({
    schema,
    resolverAddress: ZERO_ADDRESS,
    revocable: true,
  });
  const schemaId = tx.wait();
  logger.info('New Schema created:', schemaId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
