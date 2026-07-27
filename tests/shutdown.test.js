import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createShutdownHandler } from '../server/shutdown.js';

describe('server shutdown', () => {
  it('closes once and exits cleanly', () => {
    const exits = [];
    const cleared = [];
    let closeCallback;
    let closeCalls = 0;
    const timer = { unrefCalled: false, unref() { this.unrefCalled = true; } };
    const shutdown = createShutdownHandler({
      server: {
        close(callback) {
          closeCalls += 1;
          closeCallback = callback;
        }
      },
      exit: (code) => exits.push(code),
      log: () => {},
      setTimer: () => timer,
      clearTimer: (value) => cleared.push(value)
    });

    shutdown('SIGTERM');
    shutdown('SIGINT');
    closeCallback();

    assert.equal(closeCalls, 1);
    assert.equal(timer.unrefCalled, true);
    assert.deepEqual(cleared, [timer]);
    assert.deepEqual(exits, [0]);
  });

  it('forces a failed exit after the timeout', () => {
    const exits = [];
    let timeoutCallback;
    const shutdown = createShutdownHandler({
      server: { close() {} },
      exit: (code) => exits.push(code),
      log: () => {},
      setTimer: (callback) => {
        timeoutCallback = callback;
        return { unref() {} };
      },
      clearTimer: () => {}
    });

    shutdown('SIGTERM');
    timeoutCallback();

    assert.deepEqual(exits, [1]);
  });
});
