import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { getHelpText, runCli } from '../src/index.js';

const execFileAsync = promisify(execFile);

describe('RepoBelt CLI foundation', () => {
  it('exposes help text with the product promise and core commands', () => {
    const help = getHelpText();

    expect(help).toContain('RepoBelt');
    expect(help).toContain('A seatbelt for AI-generated pull requests');
    expect(help).toContain('init');
    expect(help).toContain('--preset <default|web|node|python|infra|monorepo>');
    expect(help).toContain('--pr-comment');
    expect(help).toContain('--strict');
    expect(help).toContain('check');
  });

  it('prints help and exits successfully for --help', async () => {
    const writes: string[] = [];

    const result = await runCli(['--help'], {
      stdout: (message) => writes.push(message),
      stderr: (message) => writes.push(`ERR:${message}`),
    });

    expect(result.exitCode).toBe(0);
    expect(writes.join('\n')).toContain('Usage: repobelt');
  });

  it('prints check-specific help for check --help', async () => {
    const writes: string[] = [];

    const result = await runCli(['check', '--help'], {
      stdout: (message) => writes.push(message),
      stderr: (message) => writes.push(`ERR:${message}`),
    });

    expect(result.exitCode).toBe(0);
    expect(writes.join('\n')).toContain('Usage: repobelt check');
    expect(writes.join('\n')).toContain('--format <text|markdown|json|sarif|github>');
    expect(writes.join('\n')).toContain('--diff <base...head>');
    expect(writes.join('\n')).toContain('--against <branch>');
    expect(writes.join('\n')).toContain('--since-main');
    expect(writes.join('\n')).toContain('--output <path>');
    expect(writes.join('\n')).toContain('--summary <path>');
    expect(writes.join('\n')).toContain('--pr-comment <number|auto>');
    expect(writes.join('\n')).toContain('--print-config');
    expect(writes.join('\n')).toContain('--explain <path>');
    expect(writes.join('\n')).toContain('--explain-from <path>');
    expect(writes.join('\n')).toContain('--explain-stdin');
    expect(writes.join('\n')).toContain('--config <path>');
    expect(writes.join('\n')).toContain('--baseline <path>');
    expect(writes.join('\n')).toContain('--changed-files <path>');
    expect(writes.join('\n')).toContain('--stdin-changed-files');
    expect(writes.join('\n')).toContain('--max-files <n>');
    expect(writes.join('\n')).toContain('--max-risky <n>');
    expect(writes.join('\n')).toContain('--max-secrets <n>');
    expect(writes.join('\n')).toContain('--fail-on-warn');
    expect(writes.join('\n')).toContain('--codeowners-diagnostics-fail');
  });

  it('prints planned init files for init --dry-run', async () => {
    const writes: string[] = [];

    const result = await runCli(['init', '--dry-run'], {
      stdout: (message) => writes.push(message),
      stderr: (message) => writes.push(`ERR:${message}`),
    });

    expect(result.exitCode).toBe(0);
    expect(writes.join('\n')).toContain('.repobelt.yml');
    expect(writes.join('\n')).toContain('.github/workflows/repobelt.yml');
  });

  it('lists available init presets with descriptions', async () => {
    const writes: string[] = [];

    const result = await runCli(['init', '--list-presets'], {
      stdout: (message) => writes.push(message),
      stderr: (message) => writes.push(`ERR:${message}`),
    });

    expect(result.exitCode).toBe(0);
    const output = writes.join('\n');
    expect(output).toContain('Available RepoBelt init presets:');
    expect(output).toContain('default  Baseline policy for any repository');
    expect(output).toContain('web      Frontend and full-stack web apps with API routes and build checks');
    expect(output).toContain('monorepo Workspace repositories with shared tooling, package boundaries, and affected checks');
  });

  it('creates starter files for init in the provided working directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-'));
    const writes: string[] = [];

    try {
      const result = await runCli(
        ['init'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('Created .repobelt.yml');
      await expect(readFile(join(dir, '.repobelt.yml'), 'utf8')).resolves.toContain('version: 1');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates starter files with PR comment workflow support for init --pr-comment', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-pr-comment-'));

    try {
      const result = await runCli(['init', '--pr-comment'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });

      expect(result.exitCode).toBe(0);
      const workflow = await readFile(join(dir, '.github/workflows/repobelt.yml'), 'utf8');
      expect(workflow).toContain('issues: write');
      expect(workflow).toContain('GH_TOKEN: ${{ github.token }}');
      expect(workflow).toContain('--pr-comment auto');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates starter files with strict workflow support for init --strict', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-strict-'));

    try {
      const result = await runCli(['init', '--strict'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });

      expect(result.exitCode).toBe(0);
      const policy = await readFile(join(dir, '.repobelt.yml'), 'utf8');
      const workflow = await readFile(join(dir, '.github/workflows/repobelt.yml'), 'utf8');
      expect(policy).toContain('max_files: 50');
      expect(policy).toContain('max_risky: 0');
      expect(policy).toContain('max_secrets: 0');
      expect(workflow).toContain('--since-main');
      expect(workflow).toContain('--fail-on-warn');
      expect(workflow).toContain('--codeowners-diagnostics-fail');
      expect(workflow).toContain('--max-files 50');
      expect(workflow).toContain('--max-risky 0');
      expect(workflow).toContain('--max-secrets 0');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates web preset files for init --preset web', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-web-'));

    try {
      const result = await runCli(['init', '--preset', 'web'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });

      expect(result.exitCode).toBe(0);
      const policy = await readFile(join(dir, '.repobelt.yml'), 'utf8');
      expect(policy).toContain('# Preset: web');
      expect(policy).toContain('app/api/**: require_review');
      expect(policy).toContain('  - build');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates node preset files for init --preset node', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-node-'));

    try {
      const result = await runCli(['init', '--preset', 'node'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });

      expect(result.exitCode).toBe(0);
      const policy = await readFile(join(dir, '.repobelt.yml'), 'utf8');
      expect(policy).toContain('# Preset: node');
      expect(policy).toContain('tsconfig*.json: require_review');
      expect(policy).toContain('  - build');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates python preset files for init --preset python', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-python-'));

    try {
      const result = await runCli(['init', '--preset', 'python'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });

      expect(result.exitCode).toBe(0);
      const policy = await readFile(join(dir, '.repobelt.yml'), 'utf8');
      expect(policy).toContain('# Preset: python');
      expect(policy).toContain('pyproject.toml: require_review');
      expect(policy).toContain('alembic/**: require_review');
      expect(policy).toContain('  - build');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates infra preset files for init --preset infra', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-infra-'));

    try {
      const result = await runCli(['init', '--preset', 'infra'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });

      expect(result.exitCode).toBe(0);
      const policy = await readFile(join(dir, '.repobelt.yml'), 'utf8');
      expect(policy).toContain('# Preset: infra');
      expect(policy).toContain('**/*.tf: require_review');
      expect(policy).toContain('k8s/**: require_review');
      expect(policy).toContain('  - plan');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('creates monorepo preset files for init --preset monorepo', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-init-monorepo-'));

    try {
      const result = await runCli(['init', '--preset', 'monorepo'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });

      expect(result.exitCode).toBe(0);
      const policy = await readFile(join(dir, '.repobelt.yml'), 'utf8');
      expect(policy).toContain('# Preset: monorepo');
      expect(policy).toContain('pnpm-workspace.yaml: require_review');
      expect(policy).toContain('packages/*/package.json: require_review');
      expect(policy).toContain('  - affected');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects init --preset when no preset value is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['init', '--preset'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --preset');
  });

  it('explains how a single path matches ignore, policy, and CODEOWNERS rules', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-explain-'));
    const writes: string[] = [];

    try {
      await mkdir(join(dir, '.github'), { recursive: true });
      await writeFile(join(dir, '.github', 'CODEOWNERS'), '* @core-team\nauth/** @security-team\n');
      await writeFile(join(dir, '.repobeltignore'), 'generated/**\n');
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - generated/.env
  - secrets/**
risky_paths:
  auth/**: require_review
required_checks: []
allowlist:
  paths:
    - docs/**
`);

      const result = await runCli(
        ['check', '--explain', 'auth/login.ts'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt explain: auth/login.ts');
      expect(output).toContain('Status: warn');
      expect(output).toContain('Ignore: no match');
      expect(output).toContain('Protected: no match');
      expect(output).toContain('Allowlist: no match');
      expect(output).toContain('Risky: auth/** -> require_review');
      expect(output).toContain('CODEOWNERS: auth/** -> @security-team');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints JSON explanation when --explain is combined with --format json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-explain-json-'));
    const writes: string[] = [];

    try {
      await mkdir(join(dir, '.github'), { recursive: true });
      await writeFile(join(dir, '.github', 'CODEOWNERS'), 'auth/** @security-team\n');
      await writeFile(join(dir, '.repobeltignore'), 'generated/**\n');
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - secrets/**
risky_paths:
  auth/**: require_review
required_checks: []
allowlist:
  paths: []
`);

      const result = await runCli(
        ['check', '--explain', 'auth/login.ts', '--format', 'json'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(writes.join('\n')) as {
        path: string;
        status: string;
        ignore: { matchedPattern: string | null };
        protected: { matchedPattern: string | null };
        allowlist: { matchedPattern: string | null };
        risky: { matchedPattern: string | null; action: string | null };
        codeowners: { matchedPattern: string | null; owners: string[] };
      };
      expect(parsed).toEqual({
        path: 'auth/login.ts',
        status: 'warn',
        ignore: { matchedPattern: null },
        protected: { matchedPattern: null },
        allowlist: { matchedPattern: null },
        risky: { matchedPattern: 'auth/**', action: 'require_review' },
        codeowners: { matchedPattern: 'auth/**', owners: ['@security-team'] },
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('explains multiple paths from a newline-delimited file list', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-explain-from-'));
    const writes: string[] = [];

    try {
      await mkdir(join(dir, '.github'), { recursive: true });
      await writeFile(join(dir, '.github', 'CODEOWNERS'), 'auth/** @security-team\n');
      await writeFile(join(dir, '.repobeltignore'), 'generated/**\n');
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - secrets/**
risky_paths:
  auth/**: require_review
required_checks: []
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'paths.txt'), 'auth/login.ts\ngenerated/file.ts\nsecrets/key.pem\n');

      const result = await runCli(
        ['check', '--explain-from', 'paths.txt'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt explain: auth/login.ts');
      expect(output).toContain('Status: warn');
      expect(output).toContain('RepoBelt explain: generated/file.ts');
      expect(output).toContain('Status: ignored');
      expect(output).toContain('RepoBelt explain: secrets/key.pem');
      expect(output).toContain('Status: fail');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('explains newline-delimited paths from stdin', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-explain-stdin-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobeltignore'), 'generated/**\n');
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - secrets/**
risky_paths:
  auth/**: require_review
required_checks: []
allowlist:
  paths: []
`);

      const result = await runCli(
        ['check', '--explain-stdin'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir, stdin: async () => 'auth/login.ts\ngenerated/file.ts\nsecrets/key.pem\n' },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt explain: auth/login.ts');
      expect(output).toContain('Status: warn');
      expect(output).toContain('RepoBelt explain: generated/file.ts');
      expect(output).toContain('Status: ignored');
      expect(output).toContain('RepoBelt explain: secrets/key.pem');
      expect(output).toContain('Status: fail');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints JSON array explanation when --explain-stdin is combined with --format json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-explain-stdin-json-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobeltignore'), 'generated/**\n');
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - secrets/**
risky_paths:
  auth/**: require_review
required_checks: []
allowlist:
  paths: []
`);

      const result = await runCli(
        ['check', '--explain-stdin', '--format', 'json'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir, stdin: async () => 'auth/login.ts\nauth/login.ts\ngenerated/file.ts\n' },
      );

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(writes.join('\n')) as Array<{ path: string; status: string }>;
      expect(parsed).toEqual([
        expect.objectContaining({ path: 'auth/login.ts', status: 'warn' }),
        expect.objectContaining({ path: 'generated/file.ts', status: 'ignored' }),
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints JSON array explanation when --explain-from is combined with --format json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-explain-from-json-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobeltignore'), 'generated/**\n');
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - secrets/**
risky_paths:
  auth/**: require_review
required_checks: []
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'paths.txt'), 'auth/login.ts\nauth/login.ts\ngenerated/file.ts\n');

      const result = await runCli(
        ['check', '--explain-from', 'paths.txt', '--format', 'json'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(writes.join('\n')) as Array<{ path: string; status: string }>;
      expect(parsed).toEqual([
        expect.objectContaining({ path: 'auth/login.ts', status: 'warn' }),
        expect.objectContaining({ path: 'generated/file.ts', status: 'ignored' }),
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --explain-from when no list path is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--explain-from'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --explain-from');
  });

  it('rejects check --explain-stdin when combined with another explain input', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--explain', 'auth/login.ts', '--explain-stdin'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Use only one of --explain, --explain-from, or --explain-stdin');
  });

  it('explains ignored paths before policy status', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-explain-ignore-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobeltignore'), 'generated/**\n');
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - generated/.env
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);

      const result = await runCli(
        ['check', '--explain', 'generated/.env'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('Status: ignored');
      expect(output).toContain('Ignore: generated/**');
      expect(output).toContain('Protected: generated/.env');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --explain when no path is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--explain'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --explain');
  });

  it('prints the resolved check configuration without running a diff', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-print-config-'));
    const writes: string[] = [];

    try {
      await mkdir(join(dir, '.github'), { recursive: true });
      await writeFile(join(dir, '.github', 'CODEOWNERS'), 'auth/** @security-team\n');
      await writeFile(join(dir, 'strict.repobelt.yml'), `version: 1
protected_paths:
  - .env
risky_paths:
  auth/**: require_review
required_checks:
  - test
limits:
  max_files: 5
  max_risky: 1
  max_secrets: 0
allowlist:
  paths:
    - docs/**
`);

      const result = await runCli(
        ['check', '--print-config', '--config', 'strict.repobelt.yml', '--max-files', '3', '--fail-on-warn'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(writes.join('\n')) as {
        policyPath: string;
        codeownersPath: string | null;
        policy: { protectedPaths: string[]; riskyPaths: Record<string, string>; limits: { maxFiles: number; maxRisky: number; maxSecrets: number } };
        cliOverrides: { maxFiles: number; failOnWarn: boolean };
        effectiveLimits: { maxFiles: number; maxRisky: number; maxSecrets: number };
      };
      expect(parsed.policyPath).toBe('strict.repobelt.yml');
      expect(parsed.codeownersPath).toBe('.github/CODEOWNERS');
      expect(parsed.policy.protectedPaths).toEqual(['.env']);
      expect(parsed.policy.riskyPaths).toEqual({ 'auth/**': 'require_review' });
      expect(parsed.policy.limits).toEqual({ maxFiles: 5, maxRisky: 1, maxSecrets: 0 });
      expect(parsed.cliOverrides).toEqual({ maxFiles: 3, failOnWarn: true });
      expect(parsed.effectiveLimits).toEqual({ maxFiles: 3, maxRisky: 1, maxSecrets: 0 });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('runs check against an explicit git diff range with --diff', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-diff-range-'));
    const writes: string[] = [];

    try {
      await execFileAsync('git', ['init', '-b', 'main'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await execFileAsync('git', ['checkout', '-b', 'feature/auth-change'], { cwd: dir });
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const loginChanged = true;\n');
      await execFileAsync('git', ['add', 'auth/login.ts'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'add auth change'], { cwd: dir });

      const result = await runCli(
        ['check', '--diff', 'main...HEAD'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('RepoBelt check passed with warnings');
      expect(writes.join('\n')).toContain('Risky: auth/login.ts matched auth/**');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --diff when no range is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--diff'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --diff');
  });

  it('rejects check --diff when --base or --head are also provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--diff', 'main...HEAD', '--base', 'main'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Use comparison shorthands instead of --base/--head, not both');
  });

  it('runs check against a branch comparison with --against', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-against-'));
    const writes: string[] = [];

    try {
      await execFileAsync('git', ['init', '-b', 'main'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await execFileAsync('git', ['checkout', '-b', 'feature/auth-change'], { cwd: dir });
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const loginChanged = true;\n');
      await execFileAsync('git', ['add', 'auth/login.ts'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'add auth change'], { cwd: dir });

      const result = await runCli(
        ['check', '--against', 'main'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('RepoBelt check passed with warnings');
      expect(writes.join('\n')).toContain('Risky: auth/login.ts matched auth/**');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints --since-main as an origin/main comparison in resolved config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-since-main-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);

      const result = await runCli(
        ['check', '--print-config', '--since-main'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      const parsed = JSON.parse(writes.join('\n')) as { cliOverrides: { diff: string } };
      expect(result.exitCode).toBe(0);
      expect(parsed.cliOverrides.diff).toBe('origin/main...HEAD');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --against when no branch is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--against'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --against');
  });

  it('rejects multiple comparison shorthands', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--diff', 'main...HEAD', '--since-main'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Use only one of --diff, --against, or --since-main');
  });

  it('rejects comparison shorthands when --base or --head are also provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--against', 'main', '--head', 'HEAD'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Use comparison shorthands instead of --base/--head, not both');
  });

  it('ignores findings that are already present in a JSON baseline report', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-baseline-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  auth/**: require_review
required_checks:
  - baseline-check
allowlist:
  paths: []
`);
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'custom-secret.txt'), 'safe fixture\n');
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const login = true;\n');
      await writeFile(join(dir, 'changed-files.txt'), 'custom-secret.txt\nauth/login.ts\n');
      await writeFile(join(dir, 'repobelt-baseline.json'), JSON.stringify({
        pathPolicy: {
          blocked: [{ path: 'custom-secret.txt', matchedPattern: 'custom-secret.txt' }],
          risky: [{ path: 'auth/login.ts', matchedPattern: 'auth/**', action: 'require_review' }],
        },
        secretFindings: [],
      }));

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--baseline', 'repobelt-baseline.json'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check passed');
      expect(output).not.toContain('Blocked: custom-secret.txt');
      expect(output).not.toContain('Risky: auth/login.ts');
      expect(output).toContain('Required checks: baseline-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('ignores matching secret findings from a JSON baseline report', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-baseline-secret-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', 'config.ts'), `export const token = "${'ghp_'}${'a'.repeat(36)}";\n`);
      await writeFile(join(dir, 'changed-files.txt'), 'src/config.ts\n');
      await writeFile(join(dir, 'repobelt-baseline.json'), JSON.stringify({
        pathPolicy: { blocked: [], risky: [] },
        secretFindings: [
          { path: 'src/config.ts', line: 1, kind: 'github_token', matchedPattern: 'GitHub token' },
        ],
      }));

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--baseline', 'repobelt-baseline.json'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check passed');
      expect(output).not.toContain('Secret: src/config.ts');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('still fails on new findings that are not present in the baseline', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-baseline-new-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
  - new-secret.txt
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'custom-secret.txt'), 'safe fixture\n');
      await writeFile(join(dir, 'new-secret.txt'), 'safe fixture\n');
      await writeFile(join(dir, 'changed-files.txt'), 'custom-secret.txt\nnew-secret.txt\n');
      await writeFile(join(dir, 'repobelt-baseline.json'), JSON.stringify({
        pathPolicy: {
          blocked: [{ path: 'custom-secret.txt', matchedPattern: 'custom-secret.txt' }],
          risky: [],
        },
        secretFindings: [],
      }));

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--baseline', 'repobelt-baseline.json'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check failed');
      expect(output).not.toContain('Blocked: custom-secret.txt');
      expect(output).toContain('Blocked: new-secret.txt matched new-secret.txt');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --baseline when no baseline path is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--baseline'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --baseline');
  });

  it('applies .repobeltignore before reports and count guardrails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-ignore-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - generated/.env
risky_paths:
  auth/**: require_review
required_checks:
  - ignore-check
allowlist:
  paths: []
`);
      await writeFile(join(dir, '.repobeltignore'), '# generated fixtures\ngenerated/**\n*.snap\n');
      await mkdir(join(dir, 'generated'), { recursive: true });
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'generated', '.env'), `TOKEN=${'ghp_'}${'a'.repeat(36)}\n`);
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const login = true;\n');
      await writeFile(join(dir, 'view.snap'), 'snapshot\n');
      await writeFile(join(dir, 'changed-files.txt'), 'generated/.env\nauth/login.ts\nview.snap\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--max-files', '1'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check passed with warnings');
      expect(output).toContain('Risky: auth/login.ts matched auth/**');
      expect(output).not.toContain('generated/.env');
      expect(output).not.toContain('Too many changed files');
      expect(output).toContain('Required checks: ignore-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('runs check and exits 1 when a protected path changed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-check-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, '.env'), 'SECRET=value\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      expect(writes.join('\n')).toContain('RepoBelt check failed');
      expect(writes.join('\n')).toContain('.env');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('runs check and reports secret findings', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-secret-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', 'config.ts'), `export const token = "${'ghp_'}${'a'.repeat(36)}";\n`);

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const secretLabel = ['Se', 'cret'].join('');
      expect(writes.join('\n')).toContain(`${secretLabel}: src/config.ts:1 ${'github'}_token`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints a markdown report for check --format markdown', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-report-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, '.env'), 'SECRET=value\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree', '--format', 'markdown'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      expect(writes.join('\n')).toContain('# RepoBelt Report');
      expect(writes.join('\n')).toContain('## Blocked files');
      expect(writes.join('\n')).toContain('- `.env` matched `.env`');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints JSON for check --format json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-json-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, '.env'), 'SECRET=value\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree', '--format', 'json'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      const parsed = JSON.parse(writes.join('\n')) as { status: string; pathPolicy: { blocked: Array<{ path: string }> } };
      expect(result.exitCode).toBe(1);
      expect(parsed.status).toBe('fail');
      expect(parsed.pathPolicy.blocked[0]?.path).toBe('.env');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints SARIF for check --format sarif', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-sarif-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, '.env'), 'SECRET=value\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree', '--format', 'sarif'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      const parsed = JSON.parse(writes.join('\n')) as { version: string; runs: Array<{ results: Array<{ ruleId: string }> }> };
      expect(result.exitCode).toBe(1);
      expect(parsed.version).toBe('2.1.0');
      expect(parsed.runs[0]?.results[0]?.ruleId).toBe('repobelt/protected-path');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes formatted check output to --output file without printing the report to stdout', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-output-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, '.env'), 'SECRET=value\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree', '--format', 'markdown', '--output', 'reports/repobelt.md'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      const report = await readFile(join(dir, 'reports', 'repobelt.md'), 'utf8');
      expect(result.exitCode).toBe(1);
      expect(report).toContain('# RepoBelt Report');
      expect(report).toContain('- `.env` matched `.env`');
      expect(writes.join('\n')).toContain('Wrote RepoBelt report to reports/repobelt.md');
      expect(writes.join('\n')).not.toContain('# RepoBelt Report');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes --summary as a markdown sidecar while preserving the primary output format', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-summary-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  auth/**: require_review
required_checks:
  - summary-check
allowlist:
  paths: []
`);
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const login = true;\n');
      await writeFile(join(dir, 'changed-files.txt'), 'auth/login.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--format', 'github', '--summary', 'reports/summary.md'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      const summary = await readFile(join(dir, 'reports', 'summary.md'), 'utf8');
      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('::warning file=auth/login.ts,title=RepoBelt risky path::auth/login.ts matched auth/** and requires review');
      expect(writes.join('\n')).not.toContain('# RepoBelt Report');
      expect(summary).toContain('# RepoBelt Report');
      expect(summary).toContain('- `auth/login.ts` matched `auth/**` and requires review');
      expect(summary).toContain('- `summary-check`');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps CODEOWNERS diagnostics non-failing by default', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-codeowners-diagnostics-default-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);
      await mkdir(join(dir, '.github'), { recursive: true });
      await writeFile(join(dir, '.github', 'CODEOWNERS'), 'src/**\nsrc/** @app-team\nsrc/** @platform-team\n');
      await writeFile(join(dir, 'changed-files.txt'), 'src/app.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--format', 'markdown'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('## CODEOWNERS diagnostics');
      expect(writes.join('\n')).toContain('ownerless_rule');
      expect(writes.join('\n')).toContain('duplicate_pattern');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('exits 1 for CODEOWNERS diagnostics when --codeowners-diagnostics-fail is set', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-codeowners-diagnostics-fail-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);
      await mkdir(join(dir, '.github'), { recursive: true });
      await writeFile(join(dir, '.github', 'CODEOWNERS'), 'src/**\nsrc/** @app-team\n');
      await writeFile(join(dir, 'changed-files.txt'), 'src/app.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--codeowners-diagnostics-fail'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      expect(writes.join('\n')).toContain('RepoBelt check failed');
      expect(writes.join('\n')).toContain('CODEOWNERS diagnostics: 1');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --summary when no path is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--summary'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --summary');
  });

  it('writes --output to an absolute path when one is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-output-absolute-'));
    const outputDir = await mkdtemp(join(tmpdir(), 'repobelt-cli-output-target-'));
    const outputPath = join(outputDir, 'repobelt.json');

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, '.env'), 'SECRET=value\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree', '--format', 'json', '--output', outputPath],
        { stdout: () => undefined, stderr: () => undefined },
        { cwd: dir },
      );

      const parsed = JSON.parse(await readFile(outputPath, 'utf8')) as { status: string };
      expect(result.exitCode).toBe(1);
      expect(parsed.status).toBe('fail');
    } finally {
      await rm(dir, { recursive: true, force: true });
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('applies max-files limits from policy when no CLI override is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-policy-limits-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths: {}
required_checks:
  - policy-limit-check
limits:
  max_files: 1
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'a.ts'), 'export const a = true;\n');
      await writeFile(join(dir, 'b.ts'), 'export const b = true;\n');
      await writeFile(join(dir, 'changed-files.txt'), 'a.ts\nb.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('Too many changed files: 2 exceeds max 1');
      expect(output).toContain('Required checks: policy-limit-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('lets CLI max-files override policy limits', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-policy-limits-override-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths: {}
required_checks: []
limits:
  max_files: 1
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'a.ts'), 'export const a = true;\n');
      await writeFile(join(dir, 'b.ts'), 'export const b = true;\n');
      await writeFile(join(dir, 'changed-files.txt'), 'a.ts\nb.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--max-files', '2'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('RepoBelt check passed');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('fails with a secret budget message when secret finding count exceeds --max-secrets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-max-secrets-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths: {}
required_checks:
  - max-secrets-check
allowlist:
  paths: []
`);
      await mkdir(join(dir, 'src'), { recursive: true });
      await writeFile(join(dir, 'src', 'a.ts'), `export const a = "${'ghp_'}${'a'.repeat(36)}";\n`);
      await writeFile(join(dir, 'src', 'b.ts'), `export const b = "${'ghp_'}${'b'.repeat(36)}";\n`);
      await writeFile(join(dir, 'changed-files.txt'), 'src/a.ts\nsrc/b.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--max-secrets', '1'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check failed');
      expect(output).toContain('Too many secret findings: 2 exceeds max 1');
      expect(output).toContain('Required checks: max-secrets-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --max-secrets when the value is not a non-negative integer', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--max-secrets', '-1'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Invalid value for --max-secrets: -1');
  });

  it('fails when risky finding count exceeds --max-risky', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-max-risky-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  auth/**: require_review
required_checks:
  - max-risky-check
allowlist:
  paths: []
`);
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const login = true;\n');
      await writeFile(join(dir, 'auth', 'session.ts'), 'export const session = true;\n');
      await writeFile(join(dir, 'changed-files.txt'), 'auth/login.ts\nauth/session.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--max-risky', '1'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check failed');
      expect(output).toContain('Too many risky files: 2 exceeds max 1');
      expect(output).toContain('Required checks: max-risky-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --max-risky when the value is not a non-negative integer', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--max-risky', '-1'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Invalid value for --max-risky: -1');
  });

  it('fails when changed file count exceeds --max-files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-max-files-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  docs/**: require_review
required_checks:
  - max-files-check
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'a.ts'), 'export const a = true;\n');
      await writeFile(join(dir, 'b.ts'), 'export const b = true;\n');
      await writeFile(join(dir, 'changed-files.txt'), 'a.ts\nb.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--max-files', '1'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check failed');
      expect(output).toContain('Too many changed files: 2 exceeds max 1');
      expect(output).toContain('Required checks: max-files-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --max-files when the value is not a positive integer', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--max-files', '0'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Invalid value for --max-files: 0');
  });

  it('posts a persistent PR comment when --pr-comment is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-pr-comment-'));
    const writes: string[] = [];
    const calls: Array<{ command: string; args: string[] }> = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths: {}
required_checks:
  - test
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'custom-secret.txt'), 'safe fixture\n');
      await writeFile(join(dir, 'changed-files.txt'), 'custom-secret.txt\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--pr-comment', '42'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        {
          cwd: dir,
          execFile: async (command, args) => {
            calls.push({ command, args });
            if (args.includes('repos/:owner/:repo/issues/42/comments')) {
              return { stdout: '[]', stderr: '' };
            }
            return { stdout: '{"id":321}', stderr: '' };
          },
        },
      );

      expect(result.exitCode).toBe(1);
      expect(writes.join('\n')).toContain('Posted RepoBelt PR comment to #42');
      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual({ command: 'gh', args: ['api', 'repos/:owner/:repo/issues/42/comments', '--paginate', '--slurp'] });
      expect(calls[1].args.slice(0, 3)).toEqual(['api', 'repos/:owner/:repo/issues/42/comments', '-f']);
      const bodyArg = calls[1].args.find((arg) => arg.startsWith('body='));
      expect(bodyArg).toContain('<!-- repobelt:report -->');
      expect(bodyArg).toContain('# RepoBelt Report');
      expect(bodyArg).toContain('custom-secret.txt');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('updates an existing persistent PR comment when the marker is found', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-pr-comment-update-'));
    const writes: string[] = [];
    const calls: Array<{ command: string; args: string[] }> = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'changed-files.txt'), 'README.md\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--pr-comment', '7'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        {
          cwd: dir,
          execFile: async (command, args) => {
            calls.push({ command, args });
            if (args.includes('repos/:owner/:repo/issues/7/comments')) {
              return { stdout: '[[{"id":123,"body":"old text <!-- repobelt:report -->"}]]', stderr: '' };
            }
            return { stdout: '{"id":123}', stderr: '' };
          },
        },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('Updated RepoBelt PR comment on #7');
      expect(calls[1].args.slice(0, 5)).toEqual(['api', '-X', 'PATCH', 'repos/:owner/:repo/issues/comments/123', '-f']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('auto-detects the PR number from the GitHub Actions event when --pr-comment auto is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-pr-comment-auto-'));
    const writes: string[] = [];
    const calls: Array<{ command: string; args: string[] }> = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'changed-files.txt'), 'README.md\n');
      await writeFile(join(dir, 'event.json'), JSON.stringify({ pull_request: { number: 88 } }));

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--pr-comment', 'auto'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        {
          cwd: dir,
          env: { GITHUB_EVENT_PATH: join(dir, 'event.json') },
          execFile: async (command, args) => {
            calls.push({ command, args });
            if (args.includes('repos/:owner/:repo/issues/88/comments')) {
              return { stdout: '[]', stderr: '' };
            }
            return { stdout: '{"id":321}', stderr: '' };
          },
        },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('Posted RepoBelt PR comment to #88');
      expect(calls[0].args).toContain('repos/:owner/:repo/issues/88/comments');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --pr-comment auto when the GitHub Actions event path is unavailable', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--pr-comment', 'auto'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    }, { cwd: process.cwd(), env: {} });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Cannot auto-detect PR number: GITHUB_EVENT_PATH is not set');
  });

  it('rejects check --pr-comment when no PR number is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--pr-comment'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --pr-comment');
  });

  it('uses changed files from stdin when --stdin-changed-files is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-stdin-changed-files-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  docs/**: require_review
required_checks:
  - stdin-list-check
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'custom-secret.txt'), 'safe fixture\n');

      const result = await runCli(
        ['check', '--stdin-changed-files'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir, stdin: async () => '\ncustom-secret.txt\n\n' },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('Blocked: custom-secret.txt matched custom-secret.txt');
      expect(output).toContain('Required checks: stdin-list-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects combining --changed-files and --stdin-changed-files', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--changed-files', 'changed-files.txt', '--stdin-changed-files'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Use only one of --changed-files or --stdin-changed-files');
  });

  it('uses an explicit changed file list when --changed-files is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-changed-files-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  docs/**: require_review
required_checks:
  - explicit-list-check
allowlist:
  paths: []
`);
      await writeFile(join(dir, 'custom-secret.txt'), 'safe fixture\n');
      await writeFile(join(dir, 'changed-files.txt'), '\ncustom-secret.txt\n\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('Blocked: custom-secret.txt matched custom-secret.txt');
      expect(output).toContain('Required checks: explicit-list-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('deduplicates explicit changed-file lists before applying count guardrails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-changed-files-dedupe-'));
    const writes: string[] = [];

    try {
      await writeFile(join(dir, '.repobelt.yml'), `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  auth/**: require_review
required_checks: []
allowlist:
  paths: []
`);
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const login = true;\n');
      await writeFile(join(dir, 'changed-files.txt'), 'auth/login.ts\nauth/login.ts\n');

      const result = await runCli(
        ['check', '--changed-files', 'changed-files.txt', '--max-files', '1', '--max-risky', '1'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      const output = writes.join('\n');
      expect(output).toContain('RepoBelt check passed with warnings');
      expect(output).toContain('Risky: auth/login.ts matched auth/**');
      expect(output).not.toContain('Too many changed files');
      expect(output).not.toContain('Too many risky files');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --changed-files when no file list path is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--changed-files'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --changed-files');
  });

  it('uses a custom policy file when --config is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-config-'));
    const writes: string[] = [];

    try {
      await writeFile(
        join(dir, 'custom.repobelt.yml'),
        `version: 1
protected_paths:
  - custom-secret.txt
risky_paths:
  docs/**: require_review
required_checks:
  - custom-check
allowlist:
  paths: []
`,
      );
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, 'custom-secret.txt'), 'safe fixture\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree', '--config', 'custom.repobelt.yml'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const output = writes.join('\n');
      expect(output).toContain('Blocked: custom-secret.txt matched custom-secret.txt');
      expect(output).toContain('Required checks: custom-check');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects check --config when no config path is provided', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--config'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Missing value for --config');
  });

  it('exits 1 for risky-path warnings when --fail-on-warn is provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-fail-on-warn-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const login = true;\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree', '--fail-on-warn'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      expect(writes.join('\n')).toContain('RepoBelt check passed with warnings');
      expect(writes.join('\n')).toContain('Risky: auth/login.ts matched auth/**');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints CODEOWNERS reviewer hints in default text output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-codeowners-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await mkdir(join(dir, '.github'), { recursive: true });
      await writeFile(join(dir, '.github', 'CODEOWNERS'), 'auth/** @security-team\n');
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await mkdir(join(dir, 'auth'), { recursive: true });
      await writeFile(join(dir, 'auth', 'login.ts'), 'export const login = true;\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('Reviewer: auth/login.ts matched auth/** -> @security-team');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prints required checks in default text output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-required-checks-'));
    const writes: string[] = [];

    try {
      await runCli(['init'], { stdout: () => undefined, stderr: () => undefined }, { cwd: dir });
      await execFileAsync('git', ['init'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
      await execFileAsync('git', ['config', 'user.name', 'RepoBelt Test'], { cwd: dir });
      await writeFile(join(dir, 'README.md'), '# demo\n');
      await execFileAsync('git', ['add', '.'], { cwd: dir });
      await execFileAsync('git', ['commit', '-m', 'initial'], { cwd: dir });
      await writeFile(join(dir, 'src.ts'), 'export const ok = true;\n');

      const result = await runCli(
        ['check', '--base', 'HEAD', '--head', 'worktree'],
        {
          stdout: (message) => writes.push(message),
          stderr: (message) => writes.push(`ERR:${message}`),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(0);
      expect(writes.join('\n')).toContain('Required checks: test, lint, typecheck');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects unsupported check formats before running git', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--format', 'xml'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Unsupported format: xml');
    expect(errors.join('\n')).toContain('Supported formats: text, markdown, json, sarif');
  });

  it('reports check failures without throwing outside a git repository', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'repobelt-cli-not-git-'));
    const errors: string[] = [];

    try {
      const result = await runCli(
        ['check'],
        {
          stdout: () => undefined,
          stderr: (message) => errors.push(message),
        },
        { cwd: dir },
      );

      expect(result.exitCode).toBe(1);
      const errorOutput = errors.join('\n');
      expect(errorOutput).toContain('RepoBelt check failed:');
      expect(errorOutput.toLowerCase()).toContain('not a git repository');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reports an unsupported command with exit code 1', async () => {
    const errors: string[] = [];

    const result = await runCli(['unknown'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Unknown command: unknown');
  });
});
