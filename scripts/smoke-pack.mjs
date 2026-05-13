#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const projectRoot = new URL('..', import.meta.url).pathname;
const tempRoot = mkdtempSync(join(tmpdir(), 'repobelt-smoke-'));

function run(command, args, options = {}) {
  const printable = [command, ...args].join(' ');
  console.log(`$ ${printable}`);
  return execFileSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: 'utf8',
    input: options.input,
    stdio: options.stdio ?? 'pipe',
    env: {
      ...process.env,
      npm_config_yes: 'true',
      npm_config_audit: 'false',
      npm_config_fund: 'false',
    },
  });
}

function runExpectFailure(command, args, options = {}) {
  const printable = [command, ...args].join(' ');
  console.log(`$ ${printable}`);
  try {
    execFileSync(command, args, {
      cwd: options.cwd ?? projectRoot,
      encoding: 'utf8',
      input: options.input,
      stdio: 'pipe',
      env: {
        ...process.env,
        npm_config_yes: 'true',
        npm_config_audit: 'false',
        npm_config_fund: 'false',
      },
    });
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
  throw new Error(`${printable} unexpectedly succeeded`);
}

function expectIncludes(label, text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`${label} did not include expected text: ${expected}`);
  }
}

try {
  const packDir = join(tempRoot, 'pack');
  const appDir = join(tempRoot, 'app');
  mkdirSync(packDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });

  const packOutput = run('npm', ['pack', '--pack-destination', packDir]);
  const tarballName = packOutput.trim().split('\n').at(-1);
  if (!tarballName?.endsWith('.tgz')) {
    throw new Error(`Could not find packed tarball in npm pack output: ${packOutput}`);
  }
  const tarballPath = join(packDir, tarballName);

  run('npm', ['init', '-y'], { cwd: appDir });
  run('npm', ['install', tarballPath], { cwd: appDir });

  const helpOutput = run('npx', ['repobelt', '--help'], { cwd: appDir });
  expectIncludes('repobelt --help', helpOutput, 'Usage: repobelt <command>');
  expectIncludes('repobelt --help', helpOutput, '--list-presets');

  const checkHelpOutput = run('npx', ['repobelt', 'check', '--help'], { cwd: appDir });
  expectIncludes('repobelt check --help', checkHelpOutput, '--config <path>');
  expectIncludes('repobelt check --help', checkHelpOutput, '--changed-files <path>');
  expectIncludes('repobelt check --help', checkHelpOutput, '--stdin-changed-files');

  const presetListOutput = run('npx', ['repobelt', 'init', '--list-presets'], { cwd: appDir });
  expectIncludes('repobelt init --list-presets', presetListOutput, 'Available RepoBelt init presets:');
  expectIncludes('repobelt init --list-presets', presetListOutput, 'monorepo Workspace repositories');

  const dryRunOutput = run('npx', ['repobelt', 'init', '--dry-run'], { cwd: appDir });
  expectIncludes('repobelt init --dry-run', dryRunOutput, '.repobelt.yml');
  expectIncludes('repobelt init --dry-run', dryRunOutput, '.github/workflows/repobelt.yml');

  run('git', ['init', '-b', 'main'], { cwd: appDir });
  run('git', ['config', 'user.name', 'RepoBelt Smoke Test'], { cwd: appDir });
  run('git', ['config', 'user.email', 'smoke@example.com'], { cwd: appDir });
  run('npx', ['repobelt', 'init'], { cwd: appDir });
  writeFileSync(join(appDir, '.gitignore'), 'node_modules/\n');
  writeFileSync(join(appDir, 'README.md'), '# Smoke test app\n');
  run('git', ['add', '.'], { cwd: appDir });
  run('git', ['commit', '-m', 'initial smoke fixture'], { cwd: appDir });

  mkdirSync(join(appDir, 'auth'), { recursive: true });
  writeFileSync(join(appDir, 'auth', 'login.ts'), 'export const loginChanged = true;\n');

  const checkOutput = run('npx', ['repobelt', 'check', '--base', 'HEAD', '--head', 'worktree'], { cwd: appDir });
  expectIncludes('repobelt check', checkOutput, 'RepoBelt check passed with warnings');
  expectIncludes('repobelt check', checkOutput, 'Risky: auth/login.ts matched auth/**');

  const strictCheckOutput = runExpectFailure('npx', ['repobelt', 'check', '--base', 'HEAD', '--head', 'worktree', '--fail-on-warn'], {
    cwd: appDir,
  });
  expectIncludes('repobelt check --fail-on-warn', strictCheckOutput, 'RepoBelt check passed with warnings');

  writeFileSync(
    join(appDir, 'strict.repobelt.yml'),
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
  writeFileSync(join(appDir, 'custom-secret.txt'), 'safe fixture\n');
  const customConfigOutput = runExpectFailure(
    'npx',
    ['repobelt', 'check', '--base', 'HEAD', '--head', 'worktree', '--config', 'strict.repobelt.yml'],
    { cwd: appDir },
  );
  expectIncludes('repobelt check --config', customConfigOutput, 'Blocked: custom-secret.txt matched custom-secret.txt');
  expectIncludes('repobelt check --config', customConfigOutput, 'Required checks: custom-check');

  writeFileSync(join(appDir, 'changed-files.txt'), '\ncustom-secret.txt\n\n');
  const explicitFilesOutput = runExpectFailure(
    'npx',
    ['repobelt', 'check', '--config', 'strict.repobelt.yml', '--changed-files', 'changed-files.txt'],
    { cwd: appDir },
  );
  expectIncludes('repobelt check --changed-files', explicitFilesOutput, 'Blocked: custom-secret.txt matched custom-secret.txt');

  const stdinFilesOutput = runExpectFailure(
    'npx',
    ['repobelt', 'check', '--config', 'strict.repobelt.yml', '--stdin-changed-files'],
    { cwd: appDir, input: '\ncustom-secret.txt\n\n' },
  );
  expectIncludes('repobelt check --stdin-changed-files', stdinFilesOutput, 'Blocked: custom-secret.txt matched custom-secret.txt');

  console.log('\nRepoBelt packaged CLI smoke test passed.');
} finally {
  if (process.env.REPOBELT_KEEP_SMOKE_TMP !== '1') {
    rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept smoke test temp directory: ${tempRoot}`);
  }
}
