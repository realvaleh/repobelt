import { describe, expect, it } from 'vitest';
import { renderMarkdownReport } from '../../src/report/markdown.js';
import type { CheckResult } from '../../src/check/run-check.js';

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
    ...overrides,
  };
}

describe('markdown report rendering', () => {
  it('renders a passing check summary', () => {
    const markdown = renderMarkdownReport(baseResult());

    expect(markdown).toContain('# RepoBelt Report');
    expect(markdown).toContain('**Status:** PASS');
    expect(markdown).toContain('Changed files: 1');
    expect(markdown).toContain('No blocked paths, risky paths, or secrets found.');
    expect(markdown).toContain('No blocked paths, risky paths, or secrets found.\n\n## Reviewer action');
  });

  it('renders blocked paths and secret findings for failed checks', () => {
    const markdown = renderMarkdownReport(
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

    expect(markdown).toContain('**Status:** FAIL');
    expect(markdown).toContain('## Blocked files');
    expect(markdown).toContain('- `.env` matched `.env`');
    expect(markdown).toContain('## Secret findings');
    expect(markdown).toContain('- `src/config.ts:1` `github_token` matched GitHub token');
    expect(markdown).toContain('Do not merge until blocked findings are resolved.');
  });

  it('renders risky paths for warning checks', () => {
    const markdown = renderMarkdownReport(
      baseResult({
        status: 'warn',
        changedFiles: ['auth/login.ts'],
        pathPolicy: {
          status: 'warn',
          blocked: [],
          risky: [{ path: 'auth/login.ts', matchedPattern: 'auth/**', action: 'require_review' }],
          allowed: [],
        },
      }),
    );

    expect(markdown).toContain('**Status:** WARN');
    expect(markdown).toContain('## Risky files');
    expect(markdown).toContain('- `auth/login.ts` matched `auth/**` and requires review');
    expect(markdown).toContain('Review risky files before merging.');
  });

  it('renders CODEOWNERS reviewer hints when present', () => {
    const markdown = renderMarkdownReport(
      baseResult({
        changedFiles: ['auth/login.ts'],
        reviewerHints: [{ path: 'auth/login.ts', matchedPattern: '/auth/', owners: ['@security-team', '@backend-lead'] }],
      }),
    );

    expect(markdown).toContain('## Reviewer hints');
    expect(markdown).toContain('- `auth/login.ts` matched `/auth/`: @security-team, @backend-lead');
  });

  it('renders required checks from policy when present', () => {
    const markdown = renderMarkdownReport(baseResult({ requiredChecks: ['test', 'typecheck'] }));

    expect(markdown).toContain('## Required checks');
    expect(markdown).toContain('- `test`');
    expect(markdown).toContain('- `typecheck`');
  });
});
