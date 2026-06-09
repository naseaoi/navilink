import fs from 'node:fs/promises';
import path from 'node:path';

export default async function globalSetup() {
  await fs.rm(path.resolve('tmp/e2e-data'), { recursive: true, force: true });
}
