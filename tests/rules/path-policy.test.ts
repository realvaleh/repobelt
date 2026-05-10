import { describe, expect, it } from 'vitest';
import type { RepoBeltPolicy } from '../../src/policy/schema.js';
import { classifyChangedFiles } from '../../src/rules/path-policy.js';

const policy: RepoBeltPolicy = {
  version: 1,
  protectedPaths: ['.env', '.env.*', 'secrets/**', '**/*.pem'],
  riskyPaths: {
    'auth/**': 'require_review',
    'payments/**': 'require_review',
    'migrations/**': 'require_review',
    '.github/workflows/**': 'require_review',
  },
  requiredChecks: ['test', 'lint'],
  allowlist: {
    paths: ['docs/**'],
  },
};

describe('path policy classification', () => {
  it('classifies protected paths as blocked', () => {
    const result = classifyChangedFiles(['.env', 'secrets/prod.key', 'certs/api.pem'], policy);

    expect(result.blocked).toEqual([
      { path: '.env', matchedPattern: '.env' },
      { path: 'certs/api.pem', matchedPattern: '**/*.pem' },
      { path: 'secrets/prod.key', matchedPattern: 'secrets/**' },
    ]);
    expect(result.status).toBe('fail');
  });

  it('classifies risky paths as requiring review', () => {
    const result = classifyChangedFiles(['auth/login.ts', 'migrations/001_init.sql'], policy);

    expect(result.risky).toEqual([
      { path: 'auth/login.ts', matchedPattern: 'auth/**', action: 'require_review' },
      { path: 'migrations/001_init.sql', matchedPattern: 'migrations/**', action: 'require_review' },
    ]);
    expect(result.status).toBe('warn');
  });

  it('classifies normal paths as allowed', () => {
    const result = classifyChangedFiles(['src/button.tsx', 'tests/button.test.ts'], policy);

    expect(result.allowed).toEqual(['src/button.tsx', 'tests/button.test.ts']);
    expect(result.status).toBe('pass');
  });

  it('lets allowlisted paths override risky path patterns', () => {
    const result = classifyChangedFiles(['docs/auth/how-it-works.md'], {
      ...policy,
      riskyPaths: { 'docs/auth/**': 'require_review' },
    });

    expect(result.allowed).toEqual(['docs/auth/how-it-works.md']);
    expect(result.risky).toEqual([]);
    expect(result.status).toBe('pass');
  });
});
