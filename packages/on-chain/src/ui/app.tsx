import { Text, Box, render as inkRender } from 'ink';
import React from 'react';
import { ProgressBar } from './ProgressBar.js';
import { UiState } from './types.js';

const App = ({ fetchProgress, processProgress }) => {
  return (
    <>
      <Text>
        <Text bold={true}>Historical sync </Text>(
        <Text color="yellowBright">in progress</Text>)
      </Text>
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text>Fetching Blocks: </Text>
          <ProgressBar
            current={fetchProgress.current}
            end={fetchProgress.total}
          />
          <Text>
            {' '}
            {fetchProgress.current}/{fetchProgress.total} (blocks)
          </Text>
        </Box>
        <Box flexDirection="row">
          <Text>Processing Blocks: </Text>
          <ProgressBar
            current={processProgress.current}
            end={processProgress.total}
          />
          <Text>
            {' '}
            {processProgress.current}/{processProgress.total} (blocks)
          </Text>
        </Box>
      </Box>
    </>
  );
};

export const setupInkApp = (ui: UiState) => {
  const { rerender, unmount: inkUnmount, clear } = inkRender(<App {...ui} />);

  const render = (updatedUi: UiState) => {
    rerender(<App {...updatedUi} />);
  };

  const unmount = () => {
    clear();
    inkUnmount();
  };

  return { render, unmount };
};
