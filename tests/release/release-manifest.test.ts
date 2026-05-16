import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const manifestScript = join(projectRoot, 'scripts', 'release-manifest.mjs');

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

async function createReleaseRepo(version = '1.2.3'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'repobelt-release-manifest-'));
  await git(dir, ['init', '-b', 'main']);
  await git(dir, ['config', 'user.name', 'RepoBelt Test']);
  await git(dir, ['config', 'user.email', 'repobelt@example.com']);
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'repobelt',
        version,
        description: 'Release manifest fixture',
        files: ['CHANGELOG.md'],
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(dir, 'CHANGELOG.md'),
    `# Changelog\n\n## [${version}] - 2026-05-15\n\n### Added\n\n- Manifest-ready release note.\n`,
  );
  await git(dir, ['add', '.']);
  await git(dir, ['commit', '-m', 'initial release fixture']);
  return dir;
}

function parseManifest(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout) as Record<string, unknown>;
}

describe('release manifest', () => {
  it('registers a release:manifest script for read-only JSON release summaries', async () => {
    const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['release:manifest']).toBe('node scripts/release-manifest.mjs');
  });

  it('prints a JSON release candidate manifest when tag alignment passes', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', '-a', 'v1.2.3', '-m', 'RepoBelt v1.2.3']);

      const result = await execFileAsync('node', [manifestScript], { cwd: dir });
      const manifest = parseManifest(result.stdout);

      expect(manifest.schemaVersion).toBe(1);
      expect(manifest.status).toBe('pass');
      expect(manifest.package).toMatchObject({ name: 'repobelt', version: '1.2.3' });
      expect(manifest.git).toMatchObject({ branch: 'main', expectedTag: 'v1.2.3', tagExists: true, tagAlignedWithHead: true, workingTreeClean: true });
      expect(manifest.releaseNotes).toMatchObject({ status: 'ok', preview: '# RepoBelt v1.2.3' });
      expect(manifest.packageDryRun).toMatchObject({ status: 'ok', filename: 'repobelt-1.2.3.tgz', totalFiles: expect.any(Number) });
      expect(manifest.preflight).toMatchObject({ status: 'pass' });
      expect(manifest.latestCi).toMatchObject({ status: 'unknown' });
      expect(JSON.stringify(manifest)).not.toContain('npm publish');
      expect(result.stderr).toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints a fail manifest without mutating when the release tag is missing', async () => {
    const dir = await createReleaseRepo();

    try {
      const result = await execFileAsync('node', [manifestScript], { cwd: dir });
      const manifest = parseManifest(result.stdout);
      const status = await execFileAsync('git', ['status', '--short'], { cwd: dir });

      expect(manifest.status).toBe('fail');
      expect(manifest.git).toMatchObject({ expectedTag: 'v1.2.3', tagExists: false, tagAlignedWithHead: false, workingTreeClean: true });
      expect(manifest.releaseNotes).toMatchObject({ status: 'ok' });
      expect(manifest.packageDryRun).toMatchObject({ status: 'ok' });
      expect(manifest.preflight).toMatchObject({ status: 'fail' });
      expect(status.stdout).toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects output paths so the manifest command stays read-only', async () => {
    const dir = await createReleaseRepo();

    try {
      await expect(execFileAsync('node', [manifestScript, '--output', join(dir, 'release-manifest.json')], { cwd: dir })).rejects.toMatchObject({
        stderr: expect.stringContaining('release:manifest is read-only and does not support --output'),
      });
      await expect(execFileAsync('node', [manifestScript, `--output=${join(dir, 'release-manifest.json')}`], { cwd: dir })).rejects.toMatchObject({
        stderr: expect.stringContaining('release:manifest is read-only and does not support --output'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
