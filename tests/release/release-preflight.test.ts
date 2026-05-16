import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const preflightScript = join(projectRoot, 'scripts', 'release-preflight.mjs');

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

async function createReleaseRepo(version = '1.2.3'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'repobelt-release-preflight-'));
  await git(dir, ['init', '-b', 'main']);
  await git(dir, ['config', 'user.name', 'RepoBelt Test']);
  await git(dir, ['config', 'user.email', 'repobelt@example.com']);
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'repobelt',
        version,
        description: 'Release preflight fixture',
        files: ['CHANGELOG.md'],
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(dir, 'CHANGELOG.md'),
    `# Changelog\n\n## [${version}] - 2026-05-15\n\n### Added\n\n- Preflight-ready release note.\n`,
  );
  await git(dir, ['add', '.']);
  await git(dir, ['commit', '-m', 'initial release fixture']);
  return dir;
}

describe('release preflight', () => {
  it('registers a release:preflight script for read-only release readiness checks', async () => {
    const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['release:preflight']).toBe('node scripts/release-preflight.mjs');
  });

  it('passes when release notes, package dry-run, and release alignment all pass', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', '-a', 'v1.2.3', '-m', 'RepoBelt v1.2.3']);

      const result = await execFileAsync('node', [preflightScript], { cwd: dir });

      expect(result.stdout).toContain('RepoBelt release preflight: PASS');
      expect(result.stdout).toContain('package: repobelt@1.2.3');
      expect(result.stdout).toContain('release notes: ok');
      expect(result.stdout).toContain('release alignment: ok');
      expect(result.stdout).toContain('package dry-run: ok');
      expect(result.stdout).toContain('tarball: repobelt-1.2.3.tgz');
      expect(result.stdout).toContain('notes preview: # RepoBelt v1.2.3');
      expect(result.stdout).not.toContain('npm publish');
      expect(result.stderr).toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails but still reports notes and package dry-run when the release tag is missing', async () => {
    const dir = await createReleaseRepo();

    try {
      await expect(execFileAsync('node', [preflightScript], { cwd: dir })).rejects.toMatchObject({
        stdout: expect.stringContaining('RepoBelt release preflight: FAIL'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects output paths so preflight remains read-only', async () => {
    const dir = await createReleaseRepo();

    try {
      await expect(execFileAsync('node', [preflightScript, '--output', join(dir, 'reports', 'preflight.txt')], { cwd: dir })).rejects.toMatchObject({
        stderr: expect.stringContaining('release:preflight is read-only and does not support --output'),
      });
      await expect(execFileAsync('node', [preflightScript, `--output=${join(dir, 'reports', 'preflight.txt')}`], { cwd: dir })).rejects.toMatchObject({
        stderr: expect.stringContaining('release:preflight is read-only and does not support --output'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
