import { describe, expect, it } from 'vitest';
import { filterIgnoredPaths, firstMatchingIgnorePattern, parseIgnorePatterns } from '../../src/rules/ignore.js';

describe('.repobeltignore rules', () => {
  it('supports gitignore-style negation patterns to re-include files', () => {
    const ignoreText = `
# generated files are noisy
dist/**
!dist/manifest.json
`;

    expect(filterIgnoredPaths(['dist/app.js', 'dist/manifest.json', 'src/app.ts'], ignoreText)).toEqual([
      'dist/manifest.json',
      'src/app.ts',
    ]);
    expect(firstMatchingIgnorePattern('dist/app.js', ignoreText)).toBe('dist/**');
    expect(firstMatchingIgnorePattern('dist/manifest.json', ignoreText)).toBeUndefined();
  });

  it('applies later ignore patterns after negations in order', () => {
    const ignoreText = `
dist/**
!dist/manifest.json
dist/*.json
`;

    expect(filterIgnoredPaths(['dist/app.js', 'dist/manifest.json', 'dist/readme.txt'], ignoreText)).toEqual([]);
    expect(firstMatchingIgnorePattern('dist/manifest.json', ignoreText)).toBe('dist/*.json');
  });

  it('parses negation patterns while skipping blank lines and comments', () => {
    expect(parseIgnorePatterns('\n# comment\ndist/**\n!dist/manifest.json\n')).toEqual(['dist/**', '!dist/manifest.json']);
  });

  it('treats trailing slash ignore patterns as directory contents', () => {
    const ignoreText = `
cache/
!cache/keep.txt
`;

    expect(filterIgnoredPaths(['cache/app.log', 'cache/keep.txt', 'src/cache/app.log'], ignoreText)).toEqual([
      'cache/keep.txt',
      'src/cache/app.log',
    ]);
    expect(firstMatchingIgnorePattern('cache/app.log', ignoreText)).toBe('cache/');
    expect(firstMatchingIgnorePattern('cache/keep.txt', ignoreText)).toBeUndefined();
  });
});
