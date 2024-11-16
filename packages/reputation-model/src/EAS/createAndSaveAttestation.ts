import {
  NO_EXPIRATION,
  SchemaEncoder,
  ZERO_ADDRESS,
  ZERO_BYTES32,
} from '@ethereum-attestation-service/eas-sdk';
import { prisma } from '@reputable/data-warehouse';
import { schema, SCHEMA_ID_EAS } from '../config/config';
import logger from '../utils/logger';
import { CreateAttestationParamsEAS } from '../utils/types';

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
  recipient,
  offchain,
}: CreateAttestationParamsEAS) {
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

    // Encode the attestation data
    const schemaEncoder = new SchemaEncoder(schema);
    const encodedData = schemaEncoder.encodeData([
      {
        name: 'commitsCount',
        value: normalizedData.commitsCount,
        type: 'uint16',
      },
      {
        name: 'commitProportion',
        value: normalizedData.commitProportion,
        type: 'uint16',
      },
      {
        name: 'normalizedContributors',
        value: normalizedData.normalizedContributors,
        type: 'uint16',
      },
      {
        name: 'contributionRecency',
        value: normalizedData.contributionRecency,
        type: 'uint16',
      },
      {
        name: 'normalizedTx',
        value: normalizedData.normalizedTx,
        type: 'uint16',
      },
      {
        name: 'normalizedUniqueFrom',
        value: normalizedData.normalizedUniqueFrom,
        type: 'uint16',
      },
      {
        name: 'normalizedTve',
        value: normalizedData.normalizedTve,
        type: 'uint16',
      },
    ]);

    // Get the latest timestamp
    const latest = async () => BigInt(Math.floor(Date.now() / 1000));

    // Create the attestation
    const attestation = await offchain.signOffchainAttestation(
      {
        schema: SCHEMA_ID_EAS,
        recipient: await (recipient
          ? recipient.getAddress()
          : Promise.resolve(ZERO_ADDRESS)),
        time: await latest(),
        expirationTime: NO_EXPIRATION,
        revocable: false,
        refUID: ZERO_BYTES32,
        data: encodedData,
      },
      sender
    );

    // Common data for both update and create operations
    const attestationData = {
      refUID: attestation.message.refUID,
      version: attestation.version,
      attester: await sender.getAddress(),
      schema: attestation.message.schema,
      recipient: attestation.message.recipient,
      time: attestation.message.time,
      expirationTime: attestation.message.expirationTime, // Conversion bigint to string
      revocable: attestation.message.revocable,
      data: attestation.message.data,
      salt: attestation.message.salt || ZERO_BYTES32,
      signatureV: attestation.signature.v,
      signatureR: attestation.signature.r,
      signatureS: attestation.signature.s,
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

    logger.info(`EAS created/saved for ${contributorName}`);
  } catch (error) {
    logger.error(`Error creating attestation: ${error.message}`);
    throw error;
  }
}
