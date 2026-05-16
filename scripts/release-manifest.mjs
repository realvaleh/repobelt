#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function fail(message) {
  console.error(`RepoBelt release manifest failed: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  for (const arg of argv) {
    if (arg === '--') {
      continue;
    }

    if (arg === '--output' || arg.startsWith('--output=')) {
      fail('release:manifest is read-only and does not support --output. Redirect stdout outside the worktree if you need to save the manifest.');
    }

    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: pnpm release:manifest\n\nPrints a read-only JSON release candidate manifest with package, git/tag, latest CI, package dry-run, release notes, and preflight readiness details.\nThis command does not write files, create tags, edit GitHub releases, or publish packages.`);
      process.exit(0);
    }

    fail(`Unknown option: ${arg}`);
  }
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function tryRun(command, args, options = {}) {
  try {
    return run(command, args, options);
  } catch {
    return undefined;
  }
}

function runGit(args) {
  return tryRun('git', args);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractVersionSection(changelog, version) {
  const headingPattern = new RegExp(`^## \\[${escapeRegExp(version)}\\].*$`, 'm');
  const match = headingPattern.exec(changelog);

  if (!match || match.index === undefined) {
    return null;
  }

  const start = match.index;
  const afterHeading = start + match[0].length;
  const nextHeadingPattern = /^## \[/gm;
  nextHeadingPattern.lastIndex = afterHeading;
  const nextHeading = nextHeadingPattern.exec(changelog);
  const end = nextHeading?.index ?? changelog.length;
  return changelog.slice(start, end).trim();
}

function formatReleaseNotes(version, section) {
  const lines = section.split('\n');
  const body = lines.slice(1).join('\n').trim();
  return `# RepoBelt v${version}\n\n${body}\n`;
}

async function getReleaseNotes(version) {
  try {
    const changelog = await readFile(resolve('CHANGELOG.md'), 'utf8');
    const section = extractVersionSection(changelog, version);
    if (!section) {
      return { status: 'fail', preview: null };
    }
    const notes = formatReleaseNotes(version, section);
    return { status: 'ok', preview: notes.split('\n')[0] };
  } catch {
    return { status: 'fail', preview: null };
  }
}

function getPackageDryRun() {
  try {
    const output = run('npm', ['pack', '--dry-run', '--json', '--ignore-scripts']);
    const pack = JSON.parse(output)[0];
    return {
      status: 'ok',
      filename: pack.filename,
      packageSize: pack.size,
      unpackedSize: pack.unpackedSize,
      totalFiles: pack.files.length,
    };
  } catch (error) {
    return {
      status: 'fail',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function getGit(packageVersion) {
  const expectedTag = `v${packageVersion}`;
  const headSha = runGit(['rev-parse', 'HEAD']) ?? null;
  const headShort = runGit(['rev-parse', '--short', 'HEAD']) ?? null;
  const branch = runGit(['branch', '--show-current']) || '(detached)';
  const tagTarget = runGit(['rev-list', '-n', '1', `refs/tags/${expectedTag}`]);
  const status = runGit(['status', '--short']);
  const tagExists = tagTarget !== undefined && tagTarget.length > 0;
  const tagAlignedWithHead = headSha !== null && tagTarget === headSha;
  const workingTreeClean = status !== undefined && status.length === 0;

  return {
    branch,
    headSha,
    headShort,
    expectedTag,
    tagExists,
    tagTarget: tagTarget ?? null,
    tagAlignedWithHead,
    workingTreeClean,
  };
}

function getLatestCi(headSha, branch) {
  const output = tryRun('gh', ['run', 'list', '--branch', branch === '(detached)' ? 'main' : branch, '--limit', '1', '--json', 'databaseId,status,conclusion,headSha,url,displayTitle']);
  if (!output) {
    return { status: 'unknown', conclusion: null, url: null, headSha: null };
  }

  try {
    const runs = JSON.parse(output);
    const run = Array.isArray(runs) ? runs[0] : undefined;
    if (!run) {
      return { status: 'unknown', conclusion: null, url: null, headSha: null };
    }
    return {
      status: run.status ?? 'unknown',
      conclusion: run.conclusion ?? null,
      url: run.url ?? null,
      headSha: run.headSha ?? null,
      matchesHead: headSha !== null && run.headSha === headSha,
      title: run.displayTitle ?? null,
      runId: run.databaseId ?? null,
    };
  } catch {
    return { status: 'unknown', conclusion: null, url: null, headSha: null };
  }
}

parseArgs(process.argv.slice(2));

const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const packageName = packageJson.name;
const packageVersion = packageJson.version;

if (!packageName || !packageVersion) {
  fail('package.json must include name and version.');
}

const git = getGit(packageVersion);
const releaseNotes = await getReleaseNotes(packageVersion);
const packageDryRun = getPackageDryRun();
const latestCi = getLatestCi(git.headSha, git.branch);
const preflightPass = releaseNotes.status === 'ok' && packageDryRun.status === 'ok' && git.tagExists && git.tagAlignedWithHead && git.workingTreeClean;
const status = preflightPass ? 'pass' : 'fail';

const manifest = {
  schemaVersion: 1,
  status,
  generatedAt: new Date().toISOString(),
  package: {
    name: packageName,
    version: packageVersion,
  },
  git,
  latestCi,
  releaseNotes,
  packageDryRun,
  preflight: {
    status,
    checks: {
      releaseNotes: releaseNotes.status,
      packageDryRun: packageDryRun.status,
      tagExists: git.tagExists,
      tagAlignedWithHead: git.tagAlignedWithHead,
      workingTreeClean: git.workingTreeClean,
    },
  },
  publication: {
    npmPublishApproved: false,
    requiredApproval: `${packageName}@${packageVersion}`,
    note: 'Do not publish without explicit maintainer approval, npm authentication, and matching tag alignment.',
  },
};

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
