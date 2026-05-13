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
    expect(writes.join('\n')).toContain('--output <path>');
    expect(writes.join('\n')).toContain('--summary <path>');
    expect(writes.join('\n')).toContain('--config <path>');
    expect(writes.join('\n')).toContain('--changed-files <path>');
    expect(writes.join('\n')).toContain('--stdin-changed-files');
    expect(writes.join('\n')).toContain('--max-files <n>');
    expect(writes.join('\n')).toContain('--max-risky <n>');
    expect(writes.join('\n')).toContain('--fail-on-warn');
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
