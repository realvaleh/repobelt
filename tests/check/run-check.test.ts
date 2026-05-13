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
      { path: 'auth/login.ts', matchedPattern: '/auth/', owners: ['@security-team'] },
      { path: 'src/app.ts', matchedPattern: '*', owners: ['@core-team'] },
    ]);
  });
});
