import { describe, expect, it } from 'vitest';
import { loadPolicyFromText, secureDefaultPolicy } from '../../src/policy/load-policy.js';

describe('policy loading', () => {
  it('loads a valid RepoBelt v1 policy', () => {
    const policy = loadPolicyFromText(`
version: 1
protected_paths:
  - .env
  - secrets/**
risky_paths:
  auth/**: require_review
  payments/**: require_review
required_checks:
  - test
  - lint
allowlist:
  paths:
    - docs/**
`);

    expect(policy.version).toBe(1);
    expect(policy.protectedPaths).toEqual(['.env', 'secrets/**']);
    expect(policy.riskyPaths).toEqual({ 'auth/**': 'require_review', 'payments/**': 'require_review' });
    expect(policy.requiredChecks).toEqual(['test', 'lint']);
    expect(policy.allowlist.paths).toEqual(['docs/**']);
  });

  it('provides secure defaults when no policy text is supplied', () => {
    const policy = secureDefaultPolicy();

    expect(policy.protectedPaths).toContain('.env');
    expect(policy.protectedPaths).toContain('secrets/**');
    expect(policy.riskyPaths['migrations/**']).toBe('require_review');
  });

  it('rejects unsupported policy versions with a clear error', () => {
    expect(() =>
      loadPolicyFromText(`
version: 99
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
`),
    ).toThrow('Unsupported RepoBelt policy version: 99');
  });
});
