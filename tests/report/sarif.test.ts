import { describe, expect, it } from 'vitest';
import { renderSarifReport } from '../../src/report/sarif.js';
import type { CheckResult } from '../../src/check/run-check.js';

const result: CheckResult = {
  status: 'fail',
  changedFiles: ['.env', 'auth/login.ts', 'src/config.ts'],
  pathPolicy: {
    status: 'fail',
    blocked: [{ path: '.env', matchedPattern: '.env' }],
    risky: [{ path: 'auth/login.ts', matchedPattern: 'auth/**', action: 'require_review' }],
    allowed: ['src/config.ts'],
  },
  secretFindings: [{ path: 'src/config.ts', line: 3, kind: 'github_token', matchedPattern: 'GitHub token' }],
  reviewerHints: [{ path: 'auth/login.ts', matchedPattern: 'auth/**', owners: ['@security-team'] }],
  requiredChecks: [],
  limits: {},
};

describe('SARIF report rendering', () => {
  it('renders blocked, risky, and secret findings as SARIF results without leaking secret values', () => {
    const sarif = renderSarifReport(result);
    const parsed = JSON.parse(sarif) as {
      version: string;
      runs: Array<{
        tool: { driver: { name: string; rules: Array<{ id: string }> } };
        results: Array<{
          ruleId: string;
          level: string;
          message: { text: string };
          locations: Array<{ physicalLocation: { artifactLocation: { uri: string }; region?: { startLine: number } } }>;
        }>;
      }>;
    };

    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0]?.tool.driver.name).toBe('RepoBelt');
    expect(parsed.runs[0]?.tool.driver.rules.map((rule) => rule.id)).toEqual([
      'repobelt/protected-path',
      'repobelt/risky-path',
      'repobelt/secret-finding',
    ]);
    expect(parsed.runs[0]?.results).toEqual([
      {
        ruleId: 'repobelt/protected-path',
        level: 'error',
        message: { text: 'Protected path matched .env' },
        locations: [{ physicalLocation: { artifactLocation: { uri: '.env' } } }],
      },
      {
        ruleId: 'repobelt/risky-path',
        level: 'warning',
        message: { text: 'Risky path matched auth/** and requires review' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'auth/login.ts' } } }],
      },
      {
        ruleId: 'repobelt/secret-finding',
        level: 'error',
        message: { text: 'Secret-shaped value matched GitHub token' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/config.ts' }, region: { startLine: 3 } } }],
      },
    ]);
    expect(sarif).not.toContain('ghp_');
    expect(sarif.endsWith('\n')).toBe(true);
  });
});
