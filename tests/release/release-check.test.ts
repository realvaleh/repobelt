import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const projectRoot = new URL('../..', import.meta.url).pathname;
const releaseCheckScript = join(projectRoot, 'scripts', 'release-check.mjs');

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

async function createReleaseRepo(version = '1.2.3'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'repobelt-release-check-'));
  await git(dir, ['init', '-b', 'main']);
  await git(dir, ['config', 'user.name', 'RepoBelt Test']);
  await git(dir, ['config', 'user.email', 'repobelt@example.com']);
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'repobelt', version }, null, 2));
  await git(dir, ['add', 'package.json']);
  await git(dir, ['commit', '-m', 'initial release fixture']);
  return dir;
}

describe('release alignment check', () => {
  it('registers a release:check script for safe local release diagnostics', async () => {
    const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['release:check']).toBe('node scripts/release-check.mjs');
  });

  it('passes when the version tag points at HEAD and the working tree is clean', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', '-a', 'v1.2.3', '-m', 'RepoBelt v1.2.3']);

      const result = await execFileAsync('node', [releaseCheckScript], { cwd: dir });

      expect(result.stdout).toContain('RepoBelt release alignment: PASS');
      expect(result.stdout).toContain('package: repobelt@1.2.3');
      expect(result.stdout).toContain('tag: v1.2.3');
      expect(result.stdout).toContain('tag aligned with HEAD: yes');
      expect(result.stdout).toContain('working tree clean: yes');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails when the matching version tag is missing', async () => {
    const dir = await createReleaseRepo();

    try {
      await expect(execFileAsync('node', [releaseCheckScript], { cwd: dir })).rejects.toMatchObject({
        stdout: expect.stringContaining('RepoBelt release alignment: FAIL'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails when the version tag is behind HEAD', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', 'v1.2.3']);
      await writeFile(join(dir, 'README.md'), '# later commit\n');
      await git(dir, ['add', 'README.md']);
      await git(dir, ['commit', '-m', 'move beyond release tag']);

      await expect(execFileAsync('node', [releaseCheckScript], { cwd: dir })).rejects.toMatchObject({
        stdout: expect.stringContaining('tag aligned with HEAD: no'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails when the working tree is dirty', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', 'v1.2.3']);
      await writeFile(join(dir, 'UNTRACKED.md'), '# untracked\n');

      await expect(execFileAsync('node', [releaseCheckScript], { cwd: dir })).rejects.toMatchObject({
        stdout: expect.stringContaining('working tree clean: no'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails when only a branch matches the version tag name', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['checkout', '-b', 'v1.2.3']);

      await expect(execFileAsync('node', [releaseCheckScript], { cwd: dir })).rejects.toMatchObject({
        stdout: expect.stringContaining('tag exists: no'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
