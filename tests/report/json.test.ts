import { describe, expect, it } from 'vitest';
import { renderJsonReport } from '../../src/report/json.js';
import type { CheckResult } from '../../src/check/run-check.js';

const result: CheckResult = {
  status: 'fail',
  changedFiles: ['.env', 'src/config.ts'],
  pathPolicy: {
    status: 'fail',
    blocked: [{ path: '.env', matchedPattern: '.env' }],
    risky: [],
    allowed: ['src/config.ts'],
  },
  secretFindings: [{ path: 'src/config.ts', line: 1, kind: 'github_token', matchedPattern: 'GitHub token' }],
  reviewerHints: [
    {
      path: 'src/config.ts',
      matchedPattern: 'src/**',
      owners: ['@app-team'],
      matchedRules: [
        { pattern: '*', owners: ['@core-team'] },
        { pattern: 'src/**', owners: ['@app-team'] },
      ],
    },
  ],
  codeownerDiagnostics: [
    { line: 7, severity: 'warning', kind: 'ownerless_rule', message: 'CODEOWNERS rule has no owners', pattern: 'scripts/**' },
  ],
  requiredChecks: ['test', 'typecheck'],
  limits: {},
};

describe('JSON report rendering', () => {
  it('renders stable pretty JSON for machine consumers', () => {
    const json = renderJsonReport(result);
    const parsed = JSON.parse(json) as CheckResult;

    expect(parsed).toEqual(result);
    expect(json).toContain('\n  "status": "fail"');
    expect(json.endsWith('\n')).toBe(true);
  });
});
