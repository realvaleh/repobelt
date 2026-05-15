#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tryGit(args) {
  try {
    return runGit(args);
  } catch {
    return undefined;
  }
}

function yesNo(value) {
  return value ? 'yes' : 'no';
}

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const packageName = packageJson.name;
const packageVersion = packageJson.version;
const tagName = `v${packageVersion}`;
const head = tryGit(['rev-parse', 'HEAD']);
const headShort = tryGit(['rev-parse', '--short', 'HEAD']);
const branch = tryGit(['branch', '--show-current']) || '(detached)';
const tagTarget = tryGit(['rev-list', '-n', '1', `refs/tags/${tagName}`]);
const status = tryGit(['status', '--short']);
const tagExists = tagTarget !== undefined && tagTarget.length > 0;
const aligned = head !== undefined && tagTarget === head;
const clean = status !== undefined && status.length === 0;
const pass = tagExists && aligned && clean;

const lines = [
  `RepoBelt release alignment: ${pass ? 'PASS' : 'FAIL'}`,
  `package: ${packageName}@${packageVersion}`,
  `branch: ${branch}`,
  `head: ${headShort ?? 'unknown'}`,
  `tag: ${tagName}`,
  `tag exists: ${yesNo(tagExists)}`,
  `tag target: ${tagTarget ?? 'missing'}`,
  `tag aligned with HEAD: ${yesNo(aligned)}`,
  `working tree clean: ${yesNo(clean)}`,
];

if (!pass) {
  lines.push('recommendation: retag/recreate the release at HEAD or bump package.json and create a fresh tag before npm publish.');
}

console.log(lines.join('\n'));
process.exit(pass ? 0 : 1);
