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
    limits: {},
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
    limits: policyLimits(raw.limits),
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

function policyLimits(value: unknown): RepoBeltPolicy['limits'] {
  if (value === undefined) {
    return {};
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('RepoBelt policy field limits must be an object');
  }

  const raw = value as { max_files?: unknown; max_risky?: unknown; max_secrets?: unknown };
  return {
    maxFiles: optionalPositiveInteger(raw.max_files, 'limits.max_files'),
    maxRisky: optionalNonNegativeInteger(raw.max_risky, 'limits.max_risky'),
    maxSecrets: optionalNonNegativeInteger(raw.max_secrets, 'limits.max_secrets'),
  };
}

function optionalPositiveInteger(value: unknown, fieldName: string): number | undefined {
  const parsed = optionalInteger(value, fieldName);
  if (parsed === undefined) {
    return undefined;
  }
  if (parsed <= 0) {
    throw new Error(`RepoBelt policy field ${fieldName} must be a positive integer`);
  }
  return parsed;
}

function optionalNonNegativeInteger(value: unknown, fieldName: string): number | undefined {
  const parsed = optionalInteger(value, fieldName);
  if (parsed === undefined) {
    return undefined;
  }
  if (parsed < 0) {
    throw new Error(`RepoBelt policy field ${fieldName} must be a non-negative integer`);
  }
  return parsed;
}

function optionalInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`RepoBelt policy field ${fieldName} must be an integer`);
  }
  return value;
}
