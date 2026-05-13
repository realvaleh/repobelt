import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { describeInitPresets, generateInitFiles, supportedInitPresets, writeInitFiles } from '../../src/commands/init.js';

describe('repobelt init', () => {
  it('exposes supported preset names from the preset registry', () => {
    expect(supportedInitPresets).toEqual(['default', 'web', 'node', 'python', 'infra', 'monorepo']);
  });

  it('describes supported presets for CLI discovery', () => {
    expect(describeInitPresets()).toEqual([
      { name: 'default', description: 'Baseline policy for any repository' },
      { name: 'web', description: 'Frontend and full-stack web apps with API routes and build checks' },
      { name: 'node', description: 'Node.js and TypeScript packages with package, CLI, and script review paths' },
      { name: 'python', description: 'Python services and packages with dependency and migration review paths' },
      { name: 'infra', description: 'Infrastructure-as-code repositories with Terraform, Kubernetes, Docker, and plan checks' },
      { name: 'monorepo', description: 'Workspace repositories with shared tooling, package boundaries, and affected checks' },
    ]);
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
    expect(files['.github/workflows/repobelt.yml']).toContain('--format github');
    expect(files['.github/workflows/repobelt.yml']).toContain('--summary "$GITHUB_STEP_SUMMARY"');
    expect(files['.github/workflows/repobelt.yml']).not.toContain('--pr-comment auto');
    expect(files['.github/workflows/repobelt.yml']).not.toContain('issues: write');
    expect(files['.github/workflows/repobelt.yml']).not.toContain('GH_TOKEN:');
    expect(files['.github/workflows/repobelt.yml']).not.toContain('| tee "$GITHUB_STEP_SUMMARY"');
  });

  it('formats the generated GitHub Action check command as readable continued shell lines', () => {
    const files = generateInitFiles();
    const workflow = files['.github/workflows/repobelt.yml'];

    expect(workflow).toContain(`          npx repobelt check \\
            --diff "origin/$GITHUB_BASE_REF...$GITHUB_SHA" \\
            --format github \\
            --summary "$GITHUB_STEP_SUMMARY"
`);
  });

  it('can generate a GitHub Action with persistent PR comments enabled', () => {
    const files = generateInitFiles({ prComment: true });
    const workflow = files['.github/workflows/repobelt.yml'];

    expect(workflow).toContain('issues: write');
    expect(workflow).toContain('GH_TOKEN: ${{ github.token }}');
    expect(workflow).toContain(`          npx repobelt check \\
            --diff "origin/$GITHUB_BASE_REF...$GITHUB_SHA" \\
            --format github \\
            --summary "$GITHUB_STEP_SUMMARY" \\
            --pr-comment auto
`);
  });

  it('can generate strict policy budgets and workflow enforcement flags', () => {
    const files = generateInitFiles({ strict: true });
    const policy = files['.repobelt.yml'];
    const workflow = files['.github/workflows/repobelt.yml'];

    expect(policy).toContain('limits:');
    expect(policy).toContain('  max_files: 50');
    expect(policy).toContain('  max_risky: 0');
    expect(policy).toContain('  max_secrets: 0');
    expect(workflow).toContain(`          npx repobelt check \\
            --since-main \\
            --format github \\
            --summary "$GITHUB_STEP_SUMMARY" \\
            --fail-on-warn \\
            --codeowners-diagnostics-fail \\
            --max-files 50 \\
            --max-risky 0 \\
            --max-secrets 0
`);
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

  it('generates an infra preset policy with Terraform, Kubernetes, and Docker review paths', () => {
    const files = generateInitFiles({ preset: 'infra' });

    expect(files['.repobelt.yml']).toContain('# Preset: infra');
    expect(files['.repobelt.yml']).toContain('**/*.tf: require_review');
    expect(files['.repobelt.yml']).toContain('k8s/**: require_review');
    expect(files['.repobelt.yml']).toContain('helm/**: require_review');
    expect(files['.repobelt.yml']).toContain('Dockerfile*: require_review');
    expect(files['.repobelt.yml']).toContain('docker-compose*.yml: require_review');
    expect(files['.repobelt.yml']).toContain('  - plan');
  });

  it('generates a monorepo preset policy with workspace and shared tooling review paths', () => {
    const files = generateInitFiles({ preset: 'monorepo' });

    expect(files['.repobelt.yml']).toContain('# Preset: monorepo');
    expect(files['.repobelt.yml']).toContain('pnpm-workspace.yaml: require_review');
    expect(files['.repobelt.yml']).toContain('turbo.json: require_review');
    expect(files['.repobelt.yml']).toContain('nx.json: require_review');
    expect(files['.repobelt.yml']).toContain('packages/*/package.json: require_review');
    expect(files['.repobelt.yml']).toContain('tools/**: require_review');
    expect(files['.repobelt.yml']).toContain('  - affected');
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
