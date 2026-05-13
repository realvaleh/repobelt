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
limits:
  max_files: 10
  max_risky: 2
  max_secrets: 0
`);

    expect(policy.version).toBe(1);
    expect(policy.protectedPaths).toEqual(['.env', 'secrets/**']);
    expect(policy.riskyPaths).toEqual({ 'auth/**': 'require_review', 'payments/**': 'require_review' });
    expect(policy.requiredChecks).toEqual(['test', 'lint']);
    expect(policy.allowlist.paths).toEqual(['docs/**']);
    expect(policy.limits).toEqual({ maxFiles: 10, maxRisky: 2, maxSecrets: 0 });
  });

  it('rejects invalid limit values with a clear error', () => {
    expect(() =>
      loadPolicyFromText(`
version: 1
protected_paths: []
risky_paths: {}
required_checks: []
allowlist:
  paths: []
limits:
  max_files: 0
`),
    ).toThrow('RepoBelt policy field limits.max_files must be a positive integer');
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
