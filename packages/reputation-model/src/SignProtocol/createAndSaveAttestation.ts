import {
  NO_EXPIRATION,
  ZERO_ADDRESS,
  ZERO_BYTES32,
} from '@ethereum-attestation-service/eas-sdk';
import { prisma } from '@reputable/data-warehouse';
import { ethers } from 'ethers';
import { SCHEMA_ID_SIGN } from '../config/config';
import logger from '../utils/logger';
import { CreateAttestationParamsSignProtocol } from '../utils/types';

export async function createAndSaveAttestation({
  contributorName,
  commitsCount,
  commitProportion,
  normalizedContributors,
  contributionRecency,
  normalizedTx,
  normalizedUniqueFrom,
  normalizedTve,
  sender,
  client,
}: CreateAttestationParamsSignProtocol) {
  try {
    // Convert decimal values to integers (multiply by 1_000 to preserve 4 decimal places)
    const normalizedData = {
      commitsCount: Math.min(commitsCount, 65535), // uint16 max
      commitProportion: Math.round(commitProportion * 1000),
      normalizedContributors: Math.round(normalizedContributors * 1000),
      contributionRecency: Math.round(contributionRecency * 1000),
      normalizedTx: Math.round(normalizedTx * 1000),
      normalizedUniqueFrom: Math.round(normalizedUniqueFrom * 1000),
      normalizedTve: Math.round(normalizedTve * 1000),
    };

    const attestationInfo = await client.createAttestation({
      schemaId: SCHEMA_ID_SIGN,
      data: {
        commitsCount: normalizedData.commitsCount,
        commitProportion: normalizedData.commitProportion,
        normalizedContributors: normalizedData.normalizedContributors,
        contributionRecency: normalizedData.contributionRecency,
        normalizedTx: normalizedData.normalizedTx,
        normalizedUniqueFrom: normalizedData.normalizedUniqueFrom,
        normalizedTve: normalizedData.normalizedTve,
      },
      indexingValue: 'Reputable',
    });

    const encodedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(uint16,uint16,uint16,uint16,uint16,uint16,uint16)'],
      [
        [
          normalizedData.commitsCount,
          normalizedData.commitProportion,
          normalizedData.normalizedContributors,
          normalizedData.contributionRecency,
          normalizedData.normalizedTx,
          normalizedData.normalizedUniqueFrom,
          normalizedData.normalizedTve,
        ],
      ]
    );

    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['bytes32', 'string'],
        [
          ethers.encodeBytes32String('ATTEST_OFFCHAIN'),
          attestationInfo.attestationId,
        ]
      )
    );
    const messageHashBytes = ethers.getBytes(messageHash);
    const signature = await sender.signMessage(messageHashBytes);

    const currentTimestampMs = Date.now();

    // Common data for both update and create operations
    const attestationData = {
      refUID: attestationInfo.attestationId,
      version: 0,
      attester: await sender.getAddress(),
      schema: SCHEMA_ID_SIGN,
      recipient: ZERO_ADDRESS,
      time: Math.floor(currentTimestampMs / 1000),
      expirationTime: NO_EXPIRATION, // Conversion bigint to string
      revocable: false,
      data: encodedData,
      salt: ZERO_BYTES32,
      signature: signature,
    };

    // Save the attestation to the database
    await prisma.attestation.upsert({
      where: {
        contributorName,
      },
      update: {
        ...attestationData,
      },
      create: {
        ...attestationData,
        contributorName,
      },
    });

    logger.info(
      `SignProtocol attestation created/saved for ${contributorName}`
    );
  } catch (error) {
    logger.error(`Error creating attestation: ${error.message}`);
    throw error;
  }
}
