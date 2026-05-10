import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { getChangedFiles } from '../../src/git/changed-files.js';

const execFileAsync = promisify(execFile);

describe('changed file detection', () => {
  it('returns changed file paths between a base ref and the working tree', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-git-'));

    try {
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', 'README.md'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });

      await writeFile(join(dir, 'README.md'), '# demo\nchanged\n');
      await writeFile(join(dir, '.env'), 'SECRET=value\n');

      const files = await getChangedFiles({ cwd: dir, base: 'HEAD', head: 'worktree' });

      expect(files).toEqual(['.env', 'README.md']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
