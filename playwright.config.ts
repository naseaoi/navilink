import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

const localChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const localLaunchOptions = fs.existsSync(localChromePath) ? { executablePath: localChromePath } : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/globalSetup.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: localLaunchOptions }
    }
  ],
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 15_000,
    env: {
      PORT: '3100',
      DATA_DIR: 'tmp/e2e-data',
      AUTH_SECRET: 'e2e-auth-secret'
    }
  }
});
