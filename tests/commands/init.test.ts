import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateInitFiles, writeInitFiles } from '../../src/commands/init.js';

describe('repobelt init', () => {
  it('generates the starter policy and GitHub Action files', () => {
    const files = generateInitFiles();

    expect(files['.repobelt.yml']).toContain('version: 1');
    expect(files['.repobelt.yml']).toContain('protected_paths:');
    expect(files['.repobelt.yml']).toContain('risky_paths:');
    expect(files['.github/workflows/repobelt.yml']).toContain('RepoBelt');
    expect(files['.github/workflows/repobelt.yml']).toContain('repobelt check');
    expect(files['.github/workflows/repobelt.yml']).toContain('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true');
    expect(files['.github/workflows/repobelt.yml']).toContain('actions/checkout@v6');
    expect(files['.github/workflows/repobelt.yml']).toContain('actions/setup-node@v6');
    expect(files['.github/workflows/repobelt.yml']).not.toContain('actions/checkout@v4');
    expect(files['.github/workflows/repobelt.yml']).not.toContain('actions/setup-node@v4');
    expect(files['.github/workflows/repobelt.yml']).toContain('--format markdown');
    expect(files['.github/workflows/repobelt.yml']).toContain('$GITHUB_STEP_SUMMARY');
  });

  it('writes generated files into a target directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-init-'));

    try {
      const result = await writeInitFiles(dir);

      expect(result.created).toEqual(['.repobelt.yml', '.github/workflows/repobelt.yml']);
      await expect(readFile(join(dir, '.repobelt.yml'), 'utf8')).resolves.toContain('version: 1');
      await expect(readFile(join(dir, '.github/workflows/repobelt.yml'), 'utf8')).resolves.toContain('RepoBelt');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
