export const createShutdownHandler = ({
  server,
  exit = process.exit,
  log = console.log,
  timeoutMs = 10_000,
  setTimer = setTimeout,
  clearTimer = clearTimeout
}) => {
  let isShuttingDown = false;

  return (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log(`[System] Received ${signal}, shutting down`);
    const forceExitTimer = setTimer(() => exit(1), timeoutMs);
    forceExitTimer.unref?.();
    server.close((error) => {
      clearTimer(forceExitTimer);
      exit(error ? 1 : 0);
    });
  };
};
