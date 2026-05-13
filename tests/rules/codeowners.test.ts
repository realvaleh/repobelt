import { describe, expect, it } from 'vitest';
import { findCodeOwnerHints } from '../../src/rules/codeowners.js';

describe('CODEOWNERS reviewer hints', () => {
  it('returns owners for changed files using the last matching CODEOWNERS pattern', () => {
    const hints = findCodeOwnerHints({
      changedFiles: ['src/app.ts', 'auth/login.ts', 'docs/readme.md'],
      codeownersText: `
# Repo defaults
* @core-team
/auth/ @security-team @backend-lead
*.md @docs-team
`,
    });

    expect(hints).toEqual([
      {
        path: 'auth/login.ts',
        matchedPattern: '/auth/',
        owners: ['@security-team', '@backend-lead'],
        matchedRules: [
          { pattern: '*', owners: ['@core-team'] },
          { pattern: '/auth/', owners: ['@security-team', '@backend-lead'] },
        ],
      },
      {
        path: 'docs/readme.md',
        matchedPattern: '*.md',
        owners: ['@docs-team'],
        matchedRules: [
          { pattern: '*', owners: ['@core-team'] },
          { pattern: '*.md', owners: ['@docs-team'] },
        ],
      },
      { path: 'src/app.ts', matchedPattern: '*', owners: ['@core-team'], matchedRules: [{ pattern: '*', owners: ['@core-team'] }] },
    ]);
  });

  it('ignores blank lines, comments, and malformed entries without owners', () => {
    const hints = findCodeOwnerHints({
      changedFiles: ['payments/checkout.ts'],
      codeownersText: `
# comment
payments/**
payments/** @payments-team
`,
    });

    expect(hints).toEqual([
      {
        path: 'payments/checkout.ts',
        matchedPattern: 'payments/**',
        owners: ['@payments-team'],
        matchedRules: [{ pattern: 'payments/**', owners: ['@payments-team'] }],
      },
    ]);
  });
});
