import { formatEther } from 'viem';

// 6082511 gives 6_082_511 (more readable for humans!)
export function formatBlockNumber(blockNumber: number) {
  return new Intl.NumberFormat('en-US', {
    minimumIntegerDigits: 1,
    useGrouping: true,
  })
    .format(blockNumber)
    .replace(/,/g, '_');
}

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

// Convert totalTve to Ether with 5 decimals
export function convertToETH(value: bigint): number {
  const ethValue = Number(formatEther(value));
  return Number(ethValue?.toFixed(5));
}
