import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const releaseVersion = '0.1.1';
const releaseDate = '2026-05-15';

async function readProjectFile(path: string): Promise<string> {
  return readFile(join(projectRoot, path), 'utf8');
}

describe('0.1.1 release preparation', () => {
  it('bumps the package version to the next patch release candidate', async () => {
    const packageJson = JSON.parse(await readProjectFile('package.json')) as { version?: string };

    expect(packageJson.version).toBe(releaseVersion);
  });

  it('documents the 0.1.1 release candidate in the changelog', async () => {
    const changelog = await readProjectFile('CHANGELOG.md');

    expect(changelog).toContain(`## [${releaseVersion}] - ${releaseDate}`);
    expect(changelog).toContain('[0.1.1]: https://github.com/realvaleh/repobelt/releases/tag/v0.1.1');
  });

  it('keeps release-process commands aligned to the package version', async () => {
    const releaseProcess = await readProjectFile('docs/release-process.md');

    expect(releaseProcess).toContain(`git tag -a v${releaseVersion} -m "RepoBelt v${releaseVersion}"`);
    expect(releaseProcess).toContain('Requires explicit approval before running in the public repository.');
    expect(releaseProcess).toContain(`gh release create v${releaseVersion} --title "RepoBelt v${releaseVersion}"`);
    expect(releaseProcess).toContain(`REPOBELT_NPM_PUBLISH_APPROVED=repobelt@${releaseVersion} npm publish --access public`);
    expect(releaseProcess).toContain(`npm install repobelt@${releaseVersion}`);
    expect(releaseProcess).not.toContain('REPOBELT_NPM_PUBLISH_APPROVED=repobelt@0.1.0');
  });
});
