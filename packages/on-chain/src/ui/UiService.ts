import { Metric } from '../metrics/MetricService.js';
import { setupInkApp } from './app.js';
import { buildUiState } from './buildUiState.js';
import { UiState } from './types.js';

export class UiService {
  private metric: Metric;

  private ui: UiState = buildUiState();

  private renderInterval?: NodeJS.Timeout;

  public render?: () => void;

  private unmount?: () => void;

  private isKilled = false;

  constructor(metric: Metric) {
    this.metric = metric;

    const { render, unmount } = setupInkApp(this.ui);
    this.render = () => render(this.ui);
    this.unmount = unmount;

    this.reset();
  }

  reset() {
    this.ui = buildUiState();
    const fetchState = this.metric.getFetchBlockState();
    this.ui.fetchProgress.current = fetchState.currentBlock;
    this.ui.fetchProgress.total = fetchState.totalBlocks;

    const processState = this.metric.getProcessBlockState();
    this.ui.processProgress.current = processState.currentBlock;
    this.ui.processProgress.total = processState.totalBlocks;

    //It will refresh UI components each 1 sec
    this.renderInterval = setInterval(() => {
      if (this.isKilled) return;
      this.render?.();
    }, 1000); // Adjust the interval as needed
  }

  setReloadableError() {
    // Add logic to handle reloadable errors if needed
    this.render?.();
  }

  kill() {
    this.isKilled = true;
    clearInterval(this.renderInterval);
    this.unmount?.();
  }
}
