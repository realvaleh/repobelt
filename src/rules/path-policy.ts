import type { RepoBeltPolicy, RiskAction } from '../policy/schema.js';

export type PathPolicyStatus = 'pass' | 'warn' | 'fail';

export interface BlockedPathFinding {
  path: string;
  matchedPattern: string;
}

export interface RiskyPathFinding {
  path: string;
  matchedPattern: string;
  action: RiskAction;
}

export interface PathPolicyResult {
  status: PathPolicyStatus;
  blocked: BlockedPathFinding[];
  risky: RiskyPathFinding[];
  allowed: string[];
}

export function classifyChangedFiles(paths: string[], policy: RepoBeltPolicy): PathPolicyResult {
  const blocked: BlockedPathFinding[] = [];
  const risky: RiskyPathFinding[] = [];
  const allowed: string[] = [];

  for (const path of paths.slice().sort()) {
    const protectedPattern = firstMatchingPattern(path, policy.protectedPaths);
    if (protectedPattern !== undefined) {
      blocked.push({ path, matchedPattern: protectedPattern });
      continue;
    }

    if (matchesAny(path, policy.allowlist.paths)) {
      allowed.push(path);
      continue;
    }

    const riskyEntry = firstMatchingRiskyEntry(path, policy.riskyPaths);
    if (riskyEntry !== undefined) {
      risky.push({ path, matchedPattern: riskyEntry.pattern, action: riskyEntry.action });
      continue;
    }

    allowed.push(path);
  }

  return {
    status: blocked.length > 0 ? 'fail' : risky.length > 0 ? 'warn' : 'pass',
    blocked,
    risky,
    allowed,
  };
}

function firstMatchingRiskyEntry(
  path: string,
  riskyPaths: Record<string, RiskAction>,
): { pattern: string; action: RiskAction } | undefined {
  for (const [pattern, action] of Object.entries(riskyPaths)) {
    if (matchesGlob(path, pattern)) {
      return { pattern, action };
    }
  }
  return undefined;
}

function firstMatchingPattern(path: string, patterns: string[]): string | undefined {
  return patterns.find((pattern) => matchesGlob(path, pattern));
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesGlob(path, pattern));
}

function matchesGlob(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);
  return globToRegExp(normalizedPattern).test(normalizedPath);
}

function normalizePath(path: string): string {
  return path.split('\\').join('/').replace(/^\.\//, '');
}

function globToRegExp(pattern: string): RegExp {
  let source = '^';

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === '*' && next === '*') {
      const afterNext = pattern[index + 2];
      if (afterNext === '/') {
        source += '(?:.*/)?';
        index += 2;
      } else {
        source += '.*';
        index += 1;
      }
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    source += escapeRegExp(char);
  }

  source += '$';
  return new RegExp(source);
}

function escapeRegExp(char: string): string {
  return /[\\^$+?.()|{}[\]]/.test(char) ? `\\${char}` : char;
}
