import { parse } from 'yaml';
import type { RawRepoBeltPolicy, RepoBeltPolicy, RiskAction } from './schema.js';

export function secureDefaultPolicy(): RepoBeltPolicy {
  return {
    version: 1,
    protectedPaths: ['.env', '.env.*', 'secrets/**', '**/*.pem', '**/*.key'],
    riskyPaths: {
      'auth/**': 'require_review',
      'payments/**': 'require_review',
      'migrations/**': 'require_review',
      'infra/prod/**': 'require_review',
      '.github/workflows/**': 'require_review',
    },
    requiredChecks: ['test', 'lint', 'typecheck'],
    allowlist: {
      paths: [],
    },
  };
}

export function loadPolicyFromText(text: string | undefined | null): RepoBeltPolicy {
  if (text === undefined || text === null || text.trim() === '') {
    return secureDefaultPolicy();
  }

  const raw = parse(text) as RawRepoBeltPolicy | null;
  if (raw === null || typeof raw !== 'object') {
    throw new Error('RepoBelt policy must be a YAML object');
  }

  if (raw.version !== 1) {
    throw new Error(`Unsupported RepoBelt policy version: ${String(raw.version)}`);
  }

  return {
    version: 1,
    protectedPaths: stringArray(raw.protected_paths, 'protected_paths'),
    riskyPaths: riskyPathMap(raw.risky_paths),
    requiredChecks: stringArray(raw.required_checks, 'required_checks'),
    allowlist: {
      paths: allowlistPaths(raw.allowlist),
    },
  };
}

function stringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`RepoBelt policy field ${fieldName} must be an array`);
  }

  for (const item of value) {
    if (typeof item !== 'string') {
      throw new Error(`RepoBelt policy field ${fieldName} must contain only strings`);
    }
  }

  return value;
}

function riskyPathMap(value: unknown): Record<string, RiskAction> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('RepoBelt policy field risky_paths must be an object');
  }

  const result: Record<string, RiskAction> = {};
  for (const [pattern, action] of Object.entries(value)) {
    if (action !== 'require_review') {
      throw new Error(`Unsupported risky path action for ${pattern}: ${String(action)}`);
    }
    result[pattern] = action;
  }

  return result;
}

function allowlistPaths(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('RepoBelt policy field allowlist must be an object');
  }

  const paths = (value as { paths?: unknown }).paths ?? [];
  return stringArray(paths, 'allowlist.paths');
}
