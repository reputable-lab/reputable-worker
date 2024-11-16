import { Text } from 'ink';
import React from 'react';

export const ProgressBar = ({ current = 0, end = 100, width = 36 }) => {
  // Determine the maximum width of the progress bar
  const maxCount = width;

  // Calculate the fraction of progress completed
  const fraction = current / end;

  // Calculate the number of filled and empty characters based on the fraction
  const count = Math.min(Math.floor(maxCount * fraction), maxCount);

  return (
    <Text>
      <Text>{'█'.repeat(count)}</Text>
      <Text>{'░'.repeat(maxCount - count)}</Text>
    </Text>
  );
};
