import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const guardScript = join(projectRoot, 'scripts', 'prepublish-guard.mjs');

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd });
}

async function createReleaseRepo(version = '1.2.3'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'repobelt-prepublish-guard-'));
  await git(dir, ['init', '-b', 'main']);
  await git(dir, ['config', 'user.name', 'RepoBelt Test']);
  await git(dir, ['config', 'user.email', 'repobelt@example.com']);
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'repobelt', version }, null, 2));
  await git(dir, ['add', 'package.json']);
  await git(dir, ['commit', '-m', 'initial release fixture']);
  return dir;
}

describe('prepublish guard', () => {
  it('registers a prepublishOnly guard so npm publish cannot run accidentally', async () => {
    const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
      version?: string;
    };

    expect(packageJson.scripts?.prepublishOnly).toBe('node scripts/prepublish-guard.mjs');
  });

  it('fails without an explicit version-scoped approval environment variable', async () => {
    const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
      name?: string;
      version?: string;
    };
    const expectedApproval = `${packageJson.name}@${packageJson.version}`;

    await expect(
      execFileAsync('node', [guardScript], {
        cwd: projectRoot,
        env: { ...process.env, REPOBELT_NPM_PUBLISH_APPROVED: '' },
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining(`Set REPOBELT_NPM_PUBLISH_APPROVED=${expectedApproval}`),
    });
  });

  it('passes when an annotated version tag points at HEAD and approval matches', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', '-a', 'v1.2.3', '-m', 'RepoBelt v1.2.3']);

      const result = await execFileAsync('node', [guardScript], {
        cwd: dir,
        env: { ...process.env, REPOBELT_NPM_PUBLISH_APPROVED: 'repobelt@1.2.3' },
      });

      expect(result.stdout).toContain('RepoBelt prepublish guard passed for repobelt@1.2.3');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails when only a branch matches the version tag name', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['checkout', '-b', 'v1.2.3']);

      await expect(
        execFileAsync('node', [guardScript], {
          cwd: dir,
          env: { ...process.env, REPOBELT_NPM_PUBLISH_APPROVED: 'repobelt@1.2.3' },
        }),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining('v1.2.3 does not exist'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails approved publishes when the working tree is dirty', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', 'v1.2.3']);
      await writeFile(join(dir, 'README.md'), '# uncommitted change\n');

      await expect(
        execFileAsync('node', [guardScript], {
          cwd: dir,
          env: { ...process.env, REPOBELT_NPM_PUBLISH_APPROVED: 'repobelt@1.2.3' },
        }),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining('working tree is not clean'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails approved publishes when the version tag is not aligned with HEAD', async () => {
    const dir = await createReleaseRepo();

    try {
      await git(dir, ['tag', 'v1.2.3']);
      await writeFile(join(dir, 'README.md'), '# later commit\n');
      await git(dir, ['add', 'README.md']);
      await git(dir, ['commit', '-m', 'move beyond release tag']);

      await expect(
        execFileAsync('node', [guardScript], {
          cwd: dir,
          env: { ...process.env, REPOBELT_NPM_PUBLISH_APPROVED: 'repobelt@1.2.3' },
        }),
      ).rejects.toMatchObject({
        stderr: expect.stringContaining('v1.2.3 does not point at HEAD'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
