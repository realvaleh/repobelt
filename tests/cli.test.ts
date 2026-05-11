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
    expect(writes.join('\n')).toContain('--format <text|markdown|json>');
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

  it('rejects unsupported check formats before running git', async () => {
    const errors: string[] = [];

    const result = await runCli(['check', '--format', 'xml'], {
      stdout: () => undefined,
      stderr: (message) => errors.push(message),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join('\n')).toContain('Unsupported format: xml');
    expect(errors.join('\n')).toContain('Supported formats: text, markdown, json');
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
