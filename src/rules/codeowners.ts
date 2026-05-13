export interface CodeOwnerMatchedRule {
  pattern: string;
  owners: string[];
}

export interface CodeOwnerHint {
  path: string;
  matchedPattern: string;
  owners: string[];
  matchedRules: CodeOwnerMatchedRule[];
}

interface CodeOwnerRule {
  pattern: string;
  owners: string[];
}

export function findCodeOwnerHints(options: { changedFiles: string[]; codeownersText?: string | null }): CodeOwnerHint[] {
  const rules = parseCodeOwners(options.codeownersText);
  if (rules.length === 0) {
    return [];
  }

  const hints: CodeOwnerHint[] = [];
  for (const path of options.changedFiles.slice().sort()) {
    const matchedRules = matchingRules(path, rules);
    const effectiveRule = matchedRules.at(-1);
    if (effectiveRule !== undefined) {
      hints.push({
        path,
        matchedPattern: effectiveRule.pattern,
        owners: effectiveRule.owners,
        matchedRules: matchedRules.map((rule) => ({ pattern: rule.pattern, owners: rule.owners })),
      });
    }
  }

  return hints;
}

function parseCodeOwners(text: string | undefined | null): CodeOwnerRule[] {
  if (text === undefined || text === null || text.trim() === '') {
    return [];
  }

  const rules: CodeOwnerRule[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = stripInlineComment(line).trim();
    if (trimmed === '') {
      continue;
    }

    const [pattern, ...owners] = trimmed.split(/\s+/);
    if (pattern === undefined || owners.length === 0) {
      continue;
    }

    rules.push({ pattern, owners });
  }

  return rules;
}

function stripInlineComment(line: string): string {
  const commentIndex = line.search(/(^|\s)#/);
  if (commentIndex === -1) {
    return line;
  }
  return line.slice(0, commentIndex).trimEnd();
}

function matchingRules(path: string, rules: CodeOwnerRule[]): CodeOwnerRule[] {
  return rules.filter((rule) => matchesCodeOwnerPattern(path, rule.pattern));
}

function matchesCodeOwnerPattern(path: string, pattern: string): boolean {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizePath(pattern);

  if (normalizedPattern.endsWith('/')) {
    return normalizedPath.startsWith(normalizedPattern.slice(0, -1) + '/');
  }

  const candidate = normalizedPattern.includes('/') ? normalizedPath : basename(normalizedPath);
  return globToRegExp(normalizedPattern).test(candidate);
}

function normalizePath(value: string): string {
  return value.split('\\').join('/').replace(/^\.\//, '').replace(/^\//, '');
}

function basename(path: string): string {
  return path.split('/').at(-1) ?? path;
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
