export type SecretKind =
  | 'private_key'
  | 'github_token'
  | 'openai_token'
  | 'aws_access_key_id'
  | 'anthropic_token'
  | 'high_entropy_env_value';

export interface SecretScanInput {
  path: string;
  text: string;
}

export interface SecretFinding {
  path: string;
  line: number;
  kind: SecretKind;
  matchedPattern: string;
}

interface SecretPattern {
  kind: SecretKind;
  matchedPattern: string;
  regex: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    kind: 'private_key',
    matchedPattern: 'private key block',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  {
    kind: 'github_token',
    matchedPattern: 'GitHub token',
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{30,}\b/,
  },
  {
    kind: 'openai_token',
    matchedPattern: 'OpenAI token',
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  },
  {
    kind: 'anthropic_token',
    matchedPattern: 'Anthropic token',
    regex: /\bsk-ant-[A-Za-z0-9_-]{32,}\b/,
  },
  {
    kind: 'aws_access_key_id',
    matchedPattern: 'AWS access key id',
    regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
];

export function scanTextForSecrets(input: SecretScanInput): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = input.text.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(line)) {
        findings.push({
          path: input.path,
          line: index + 1,
          kind: pattern.kind,
          matchedPattern: pattern.matchedPattern,
        });
        break;
      }
    }

    if (isEnvPath(input.path) && hasHighEntropyEnvAssignment(line)) {
      findings.push({
        path: input.path,
        line: index + 1,
        kind: 'high_entropy_env_value',
        matchedPattern: 'high entropy env assignment',
      });
    }
  }

  return findings;
}

function isEnvPath(path: string): boolean {
  const normalized = path.split('\\').join('/');
  const basename = normalized.split('/').at(-1) ?? normalized;
  return basename === '.env' || /^\.env\.[^.]+$/.test(basename);
}

function hasHighEntropyEnvAssignment(line: string): boolean {
  const match = /^\s*[A-Z_][A-Z0-9_]*\s*=\s*['\"]?([^'\"#\s]+)['\"]?\s*(?:#.*)?$/.exec(line);
  if (match === null) {
    return false;
  }

  const value = match[1];
  if (isPlaceholder(value)) {
    return false;
  }

  return value.length >= 24 && uniqueCharacterCount(value) >= 8;
}

function isPlaceholder(value: string): boolean {
  return /^(?:your-|example|placeholder|changeme|replace-me|true|false|null)$/i.test(value)
    || value.includes('your-')
    || value.includes('example');
}

function uniqueCharacterCount(value: string): number {
  return new Set(value).size;
}
