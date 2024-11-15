import { Offchain } from '@ethereum-attestation-service/eas-sdk';
import { SignProtocolClient } from '@ethsign/sp-sdk';

export function formatDuration(milliseconds: number) {
  if (milliseconds < 1000) {
    // Less than a second, display in milliseconds
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    // Less than a minute, display in seconds
    const seconds = Math.floor(milliseconds / 1000);
    return `${seconds}sec`;
  } else {
    // Display in minutes
    const minutes = Math.floor(milliseconds / 60000);
    return `${minutes}min`;
  }
}

// Type guard function
export function isSignProtocolClient(
  client: Offchain | SignProtocolClient
): client is SignProtocolClient {
  return (client as SignProtocolClient).createAttestation !== undefined;
}

/**
 *
 * @param range defined the range of value
 * @param k defined the speed
 */
export function computeScore({
  value,
  range,
  k = 0.04,
}: {
  value: number;
  range: number;
  k?: number;
}) {
  return range * (1 - Math.exp(-k * value));
}

export function calculateRecencyContributionFactor({
  lastCommitTimestamp,
  RECENT_CONTRIBUTION_WEIGHT,
  MID_TERM_CONTRIBUTION_WEIGHT,
  LONG_TERM_CONTRIBUTION_WEIGHT,
}: {
  lastCommitTimestamp: number | null | undefined;
  RECENT_CONTRIBUTION_WEIGHT: number;
  MID_TERM_CONTRIBUTION_WEIGHT: number;
  LONG_TERM_CONTRIBUTION_WEIGHT: number;
}): number {
  if (!lastCommitTimestamp) {
    return LONG_TERM_CONTRIBUTION_WEIGHT; // Default to LONG_TERM if no timestamp is provided
  }

  const now = Date.now();
  const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

  const lastCommitTimestampMs = lastCommitTimestamp * 1000; // Convert seconds to milliseconds

  if (lastCommitTimestampMs >= threeMonthsAgo) {
    return RECENT_CONTRIBUTION_WEIGHT;
  } else if (lastCommitTimestampMs >= oneYearAgo) {
    return MID_TERM_CONTRIBUTION_WEIGHT;
  } else {
    return LONG_TERM_CONTRIBUTION_WEIGHT;
  }
}
