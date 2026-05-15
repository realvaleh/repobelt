import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const releaseNotesScript = join(projectRoot, 'scripts', 'release-notes.mjs');

async function createFixtureProject(changelog: string, version = '1.2.3'): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'repobelt-release-notes-'));
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'repobelt', version }, null, 2));
  await writeFile(join(dir, 'CHANGELOG.md'), changelog);
  return dir;
}

describe('release notes generator', () => {
  it('registers a release:notes script for read-only release note generation', async () => {
    const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['release:notes']).toBe('node scripts/release-notes.mjs');
  });

  it('prints the changelog section for the current package version', async () => {
    const dir = await createFixtureProject(`# Changelog\n\n## [1.2.3] - 2026-05-15\n\n### Added\n\n- First release note.\n- Second release note.\n\n## [1.2.2] - 2026-05-01\n\n### Fixed\n\n- Older note.\n`);

    try {
      const result = await execFileAsync('node', [releaseNotesScript], { cwd: dir });

      expect(result.stdout).toContain('# RepoBelt v1.2.3');
      expect(result.stdout).toContain('### Added');
      expect(result.stdout).toContain('- First release note.');
      expect(result.stdout).toContain('- Second release note.');
      expect(result.stdout).not.toContain('Older note.');
      expect(result.stdout).not.toContain('npm publish');
      expect(result.stderr).toBe('');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes release notes to an output path when requested', async () => {
    const dir = await createFixtureProject(`# Changelog\n\n## [1.2.3] - 2026-05-15\n\n### Changed\n\n- Safer release process.\n`);

    try {
      const outputPath = join(dir, 'release-notes.md');
      const result = await execFileAsync('node', [releaseNotesScript, '--output', outputPath], { cwd: dir });
      const notes = await readFile(outputPath, 'utf8');

      expect(result.stdout).toContain(`Wrote release notes to ${outputPath}`);
      expect(notes).toContain('# RepoBelt v1.2.3');
      expect(notes).toContain('- Safer release process.');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('accepts npm/pnpm argument separator before output options', async () => {
    const dir = await createFixtureProject(`# Changelog\n\n## [1.2.3] - 2026-05-15\n\n### Added\n\n- Separator-safe notes.\n`);

    try {
      const outputPath = join(dir, 'release-notes.md');
      const result = await execFileAsync('node', [releaseNotesScript, '--', '--output', outputPath], { cwd: dir });
      const notes = await readFile(outputPath, 'utf8');

      expect(result.stdout).toContain(`Wrote release notes to ${outputPath}`);
      expect(notes).toContain('- Separator-safe notes.');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails clearly when the current version is missing from the changelog', async () => {
    const dir = await createFixtureProject(`# Changelog\n\n## [1.2.2] - 2026-05-01\n\n- Older note.\n`);

    try {
      await expect(execFileAsync('node', [releaseNotesScript], { cwd: dir })).rejects.toMatchObject({
        stderr: expect.stringContaining('No CHANGELOG.md section found for version 1.2.3'),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
