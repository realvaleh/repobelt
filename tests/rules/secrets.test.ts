import { describe, expect, it } from 'vitest';
import { scanTextForSecrets } from '../../src/rules/secrets.js';

describe('secret scanning', () => {
  it('flags private key blocks', () => {
    const findings = scanTextForSecrets({
      path: 'keys/test.pem',
      text: `${'-----BEGIN'} PRIVATE KEY-----\nfake-test-key\n-----END PRIVATE KEY-----\n`,
    });

    expect(findings).toEqual([
      { path: 'keys/test.pem', line: 1, kind: 'private_key', matchedPattern: 'private key block' },
    ]);
  });

  it('flags common API token formats', () => {
    const findings = scanTextForSecrets({
      path: 'src/config.ts',
      text: [
        `const github = "${'ghp_'}${'a'.repeat(36)}";`,
        `const openai = "${'sk-proj-'}${'a'.repeat(48)}";`,
        `const aws = "${'AKIA'}${'A'.repeat(16)}";`,
      ].join('\n'),
    });

    expect(findings.map((finding) => finding.kind)).toEqual(['github_token', 'openai_token', 'aws_access_key_id']);
  });

  it('flags high-entropy env assignments in env files', () => {
    const findings = scanTextForSecrets({
      path: '.env',
      text: 'SESSION_SECRET=Ab3dEf4gHi5jKl6mNo7pQr8sTu9vWx0y\nSAFE_MODE=true\n',
    });

    expect(findings).toEqual([
      { path: '.env', line: 1, kind: 'high_entropy_env_value', matchedPattern: 'high entropy env assignment' },
    ]);
  });

  it('does not flag normal code and placeholder env values', () => {
    const findings = scanTextForSecrets({
      path: '.env.example',
      text: 'API_KEY=your-api-key-here\nconst label = "hello world";\n',
    });

    expect(findings).toEqual([]);
  });
});
