import { describe, expect, it } from 'vitest';
import { runCheck } from '../../src/check/run-check.js';

const policyText = `
version: 1
protected_paths:
  - .env
  - secrets/**
risky_paths:
  auth/**: require_review
required_checks:
  - test
allowlist:
  paths: []
`;

describe('runCheck', () => {
  it('returns fail when changed files include a protected path', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      changedFilesProvider: async () => ['src/app.ts', '.env'],
    });

    expect(result.status).toBe('fail');
    expect(result.pathPolicy.blocked).toEqual([{ path: '.env', matchedPattern: '.env' }]);
  });

  it('returns warn when changed files only include risky paths', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      changedFilesProvider: async () => ['auth/login.ts'],
    });

    expect(result.status).toBe('warn');
    expect(result.pathPolicy.risky).toEqual([
      { path: 'auth/login.ts', matchedPattern: 'auth/**', action: 'require_review' },
    ]);
  });

  it('returns pass when changed files are allowed', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      changedFilesProvider: async () => ['src/app.ts'],
    });

    expect(result.status).toBe('pass');
    expect(result.changedFiles).toEqual(['src/app.ts']);
  });

  it('filters changed files through .repobeltignore patterns before policy and secret checks', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      ignoreText: `
# generated code is noisy
generated/**
*.snap
`,
      changedFilesProvider: async () => ['generated/.env', 'src/view.snap', 'src/app.ts'],
      fileContentProvider: async (path) => (path === 'generated/.env' ? `TOKEN=${'ghp_'}${'a'.repeat(36)}\n` : 'safe\n'),
    });

    expect(result.status).toBe('pass');
    expect(result.changedFiles).toEqual(['src/app.ts']);
    expect(result.pathPolicy.blocked).toEqual([]);
    expect(result.secretFindings).toEqual([]);
  });

  it('allows .repobeltignore negations to re-include important files for policy and secret checks', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      ignoreText: `
dist/**
!dist/.env
`,
      changedFilesProvider: async () => ['dist/app.js', 'dist/.env'],
      fileContentProvider: async (path) => (path === 'dist/.env' ? `TOKEN=${'ghp_'}${'a'.repeat(36)}\n` : 'safe\n'),
    });

    expect(result.status).toBe('fail');
    expect(result.changedFiles).toEqual(['dist/.env']);
    expect(result.secretFindings).toEqual([
      { path: 'dist/.env', line: 1, kind: 'github_token', matchedPattern: 'GitHub token' },
    ]);
  });

  it('includes required checks from policy for reviewer context', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText: `
version: 1
protected_paths: []
risky_paths: {}
required_checks:
  - test
  - typecheck
allowlist:
  paths: []
`,
      changedFilesProvider: async () => ['src/app.ts'],
    });

    expect(result.requiredChecks).toEqual(['test', 'typecheck']);
  });

  it('returns fail when changed file content contains a secret', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      changedFilesProvider: async () => ['src/config.ts'],
      fileContentProvider: async () => `export const token = "${'ghp_'}${'a'.repeat(36)}";\n`,
    });

    expect(result.status).toBe('fail');
    expect(result.secretFindings).toEqual([
      { path: 'src/config.ts', line: 1, kind: 'github_token', matchedPattern: 'GitHub token' },
    ]);
  });

  it('includes CODEOWNERS reviewer hints when a CODEOWNERS file is available', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      changedFilesProvider: async () => ['auth/login.ts', 'src/app.ts'],
      codeownersText: `
* @core-team
/auth/ @security-team
`,
    });

    expect(result.reviewerHints).toEqual([
      {
        path: 'auth/login.ts',
        matchedPattern: '/auth/',
        owners: ['@security-team'],
        matchedRules: [
          { pattern: '*', owners: ['@core-team'] },
          { pattern: '/auth/', owners: ['@security-team'] },
        ],
      },
      { path: 'src/app.ts', matchedPattern: '*', owners: ['@core-team'], matchedRules: [{ pattern: '*', owners: ['@core-team'] }] },
    ]);
    expect(result.codeownerDiagnostics).toEqual([]);
  });

  it('includes CODEOWNERS diagnostics without changing check status', async () => {
    const result = await runCheck({
      cwd: '/repo',
      base: 'main',
      head: 'HEAD',
      policyText,
      changedFilesProvider: async () => ['src/app.ts'],
      codeownersText: `
* @core-team
scripts/**
[bad] @bad-team
src/** @app-team
src/** @platform-team
`,
    });

    expect(result.status).toBe('pass');
    expect(result.codeownerDiagnostics).toEqual([
      { line: 3, severity: 'warning', kind: 'ownerless_rule', message: 'CODEOWNERS rule has no owners', pattern: 'scripts/**' },
      { line: 4, severity: 'warning', kind: 'unsupported_pattern', message: 'CODEOWNERS pattern uses unsupported syntax', pattern: '[bad]' },
      { line: 6, severity: 'warning', kind: 'duplicate_pattern', message: 'CODEOWNERS pattern overrides an earlier rule on line 5', pattern: 'src/**' },
    ]);
  });
});
