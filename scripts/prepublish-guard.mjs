#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function fail(message) {
  console.error(`RepoBelt prepublish guard failed: ${message}`);
  process.exit(1);
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

const packageJsonPath = join(process.cwd(), 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const packageName = packageJson.name;
const packageVersion = packageJson.version;
const expectedApproval = `${packageName}@${packageVersion}`;
const approval = process.env.REPOBELT_NPM_PUBLISH_APPROVED;

if (approval !== expectedApproval) {
  fail(`Set REPOBELT_NPM_PUBLISH_APPROVED=${expectedApproval} immediately before publishing this exact package version.`);
}

const head = runGit(['rev-parse', 'HEAD']);
const tagName = `v${packageVersion}`;
let tagTarget;
try {
  tagTarget = runGit(['rev-list', '-n', '1', `refs/tags/${tagName}`]);
} catch {
  fail(`${tagName} does not exist. Create and push the version tag before npm publish.`);
}

if (tagTarget !== head) {
  fail(`${tagName} does not point at HEAD. tag=${tagTarget} head=${head}. Retag the release or bump package.json before npm publish.`);
}

const status = runGit(['status', '--short']);
if (status.length > 0) {
  fail('working tree is not clean. Commit, stash, or remove local changes before npm publish.');
}

console.log(`RepoBelt prepublish guard passed for ${expectedApproval} at ${head}.`);
