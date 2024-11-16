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
