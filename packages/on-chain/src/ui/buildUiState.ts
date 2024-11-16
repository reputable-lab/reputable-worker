import { UiState } from './types.js';

export const buildUiState = (): UiState => ({
  fetchProgress: {
    current: 0,
    total: 100,
  },
  processProgress: {
    current: 0,
    total: 100,
  },
});
