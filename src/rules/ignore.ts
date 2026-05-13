import { matchesGlob } from './path-policy.js';

export function parseIgnorePatterns(text: string | undefined): string[] {
  if (text === undefined) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

export function filterIgnoredPaths(paths: string[], ignoreText: string | undefined): string[] {
  return paths.filter((path) => firstMatchingIgnorePattern(path, ignoreText) === undefined);
}

export function firstMatchingIgnorePattern(path: string, ignoreText: string | undefined): string | undefined {
  return parseIgnorePatterns(ignoreText).find((pattern) => matchesIgnorePattern(path, pattern));
}

function matchesIgnorePattern(path: string, pattern: string): boolean {
  if (matchesGlob(path, pattern)) {
    return true;
  }

  if (!pattern.includes('/')) {
    return matchesGlob(pathBasename(path), pattern);
  }

  return false;
}

function pathBasename(path: string): string {
  const normalized = path.split('\\').join('/');
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}
