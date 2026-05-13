import { describe, expect, it } from 'vitest';
import type { CheckResult } from '../../src/check/run-check.js';
import { renderGitHubActionsReport } from '../../src/report/github-actions.js';

function baseResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    status: 'pass',
    changedFiles: ['src/app.ts'],
    pathPolicy: {
      status: 'pass',
      blocked: [],
      risky: [],
      allowed: ['src/app.ts'],
    },
    secretFindings: [],
    reviewerHints: [],
    requiredChecks: [],
    limits: {},
    ...overrides,
  };
}

describe('GitHub Actions report rendering', () => {
  it('renders errors for blocked paths and secret findings', () => {
    const report = renderGitHubActionsReport(
      baseResult({
        status: 'fail',
        changedFiles: ['.env', 'src/config.ts'],
        pathPolicy: {
          status: 'fail',
          blocked: [{ path: '.env', matchedPattern: '.env' }],
          risky: [],
          allowed: ['src/config.ts'],
        },
        secretFindings: [
          { path: 'src/config.ts', line: 1, kind: 'github_token', matchedPattern: 'GitHub token' },
        ],
      }),
    );

    expect(report).toContain('::error file=.env,title=RepoBelt protected path::.env matched .env');
    expect(report).toContain('::error file=src/config.ts,line=1,title=RepoBelt secret finding::github_token matched GitHub token');
  });

  it('renders warnings for risky paths and notices for reviewer reminders', () => {
    const report = renderGitHubActionsReport(
      baseResult({
        status: 'warn',
        changedFiles: ['auth/login.ts'],
        pathPolicy: {
          status: 'warn',
          blocked: [],
          risky: [{ path: 'auth/login.ts', matchedPattern: 'auth/**', action: 'require_review' }],
          allowed: [],
        },
        reviewerHints: [{ path: 'auth/login.ts', matchedPattern: '/auth/', owners: ['@security-team'] }],
        requiredChecks: ['test'],
      }),
    );

    expect(report).toContain('::warning file=auth/login.ts,title=RepoBelt risky path::auth/login.ts matched auth/** and requires review');
    expect(report).toContain('::notice file=auth/login.ts,title=RepoBelt reviewer hint::auth/login.ts matched /auth/ -> @security-team');
    expect(report).toContain('::notice title=RepoBelt required checks::test');
  });

  it('escapes GitHub Actions annotation control characters', () => {
    const report = renderGitHubActionsReport(
      baseResult({
        status: 'fail',
        changedFiles: ['src/a,b.ts'],
        pathPolicy: {
          status: 'fail',
          blocked: [{ path: 'src/a,b.ts', matchedPattern: 'src/**:prod' }],
          risky: [],
          allowed: [],
        },
      }),
    );

    expect(report).toContain('file=src/a%2Cb.ts');
    expect(report).toContain('matched src/**%3Aprod');
  });
});
