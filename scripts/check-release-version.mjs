import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const tagName = process.argv[2] || process.env.GITHUB_REF_NAME || '';
const versionPattern = /^v\d+\.\d+\.\d+$/;

if (!tagName) {
  console.error('Missing release tag. Usage: npm run version:check -- v1.2.3');
  process.exit(1);
}

if (!versionPattern.test(tagName)) {
  console.error(`Invalid release tag: ${tagName}. Expected vX.Y.Z.`);
  process.exit(1);
}

const tagVersion = tagName.slice(1);

if (packageJson.version !== tagVersion) {
  console.error(`Version mismatch: package.json is ${packageJson.version}, tag is ${tagVersion}.`);
  process.exit(1);
}

console.log(`Release version verified: ${tagName}`);
