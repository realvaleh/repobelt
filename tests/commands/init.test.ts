import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateInitFiles, supportedInitPresets, writeInitFiles } from '../../src/commands/init.js';

describe('repobelt init', () => {
  it('exposes supported preset names from the preset registry', () => {
    expect(supportedInitPresets).toEqual(['default', 'web', 'node', 'python']);
  });

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

  it('generates a web preset policy with frontend and API review paths', () => {
    const files = generateInitFiles({ preset: 'web' });

    expect(files['.repobelt.yml']).toContain('# Preset: web');
    expect(files['.repobelt.yml']).toContain('app/api/**: require_review');
    expect(files['.repobelt.yml']).toContain('pages/api/**: require_review');
    expect(files['.repobelt.yml']).toContain('middleware.*: require_review');
    expect(files['.repobelt.yml']).toContain('next.config.*: require_review');
    expect(files['.repobelt.yml']).toContain('pnpm-lock.yaml: require_review');
    expect(files['.repobelt.yml']).toContain('  - build');
  });

  it('generates a node preset policy with package and TypeScript review paths', () => {
    const files = generateInitFiles({ preset: 'node' });

    expect(files['.repobelt.yml']).toContain('# Preset: node');
    expect(files['.repobelt.yml']).toContain('package.json: require_review');
    expect(files['.repobelt.yml']).toContain('pnpm-lock.yaml: require_review');
    expect(files['.repobelt.yml']).toContain('tsconfig*.json: require_review');
    expect(files['.repobelt.yml']).toContain('src/cli.*: require_review');
    expect(files['.repobelt.yml']).toContain('  - build');
  });

  it('generates a python preset policy with package and migration review paths', () => {
    const files = generateInitFiles({ preset: 'python' });

    expect(files['.repobelt.yml']).toContain('# Preset: python');
    expect(files['.repobelt.yml']).toContain('pyproject.toml: require_review');
    expect(files['.repobelt.yml']).toContain('requirements*.txt: require_review');
    expect(files['.repobelt.yml']).toContain('uv.lock: require_review');
    expect(files['.repobelt.yml']).toContain('alembic/**: require_review');
    expect(files['.repobelt.yml']).toContain('scripts/**: require_review');
    expect(files['.repobelt.yml']).toContain('  - build');
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
