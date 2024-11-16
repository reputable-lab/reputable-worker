import { Offchain } from '@ethereum-attestation-service/eas-sdk';
import { SignProtocolClient } from '@ethsign/sp-sdk';
import { Signer } from 'ethers';

export type CreateAttestationParamsEAS = {
  // Contributor data
  contributorName: string;
  commitsCount: number;
  commitProportion: number;
  normalizedContributors: number;
  contributionRecency: number;
  normalizedTx: number;
  normalizedUniqueFrom: number;
  normalizedTve: number;
  sender: Signer;
  recipient?: Signer;
  offchain: Offchain;
};

export type CreateAttestationParamsSignProtocol = {
  // Contributor data
  contributorName: string;
  commitsCount: number;
  commitProportion: number;
  normalizedContributors: number;
  contributionRecency: number;
  normalizedTx: number;
  normalizedUniqueFrom: number;
  normalizedTve: number;
  sender: Signer;
  recipient?: Signer;
  client: SignProtocolClient;
};
