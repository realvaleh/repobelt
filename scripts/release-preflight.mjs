#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function fail(message) {
  console.error(`RepoBelt release preflight failed: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--output' || arg.startsWith('--output=')) {
      fail('release:preflight is read-only and does not support --output. Redirect stdout outside the worktree if you need to save the report.');
    }

    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: pnpm release:preflight\n\nRuns read-only release readiness diagnostics: changelog release notes, npm package dry-run summary, and git tag alignment.\nThis command does not write files, create tags, edit GitHub releases, or publish packages.`);
      process.exit(0);
    }

    fail(`Unknown option: ${arg}`);
  }

  return args;
}

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

function buildReleaseAlignment(packageName, packageVersion) {
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

  return {
    pass,
    lines: [
      `package: ${packageName}@${packageVersion}`,
      `branch: ${branch}`,
      `head: ${headShort ?? 'unknown'}`,
      `tag: ${tagName}`,
      `tag exists: ${yesNo(tagExists)}`,
      `tag target: ${tagTarget ?? 'missing'}`,
      `tag aligned with HEAD: ${yesNo(aligned)}`,
      `working tree clean: ${yesNo(clean)}`,
    ],
  };
}

function buildPackageDryRun() {
  const packOutput = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const pack = JSON.parse(packOutput)[0];

  return {
    pass: true,
    filename: pack.filename,
    packageSize: pack.size,
    unpackedSize: pack.unpackedSize,
    totalFiles: pack.files.length,
  };
}

const args = parseArgs(process.argv.slice(2));
const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const packageName = packageJson.name;
const packageVersion = packageJson.version;

if (!packageName || !packageVersion) {
  fail('package.json must include name and version.');
}

let releaseNotesPass = false;
let notesPreview = 'missing';
try {
  const changelog = await readFile(resolve('CHANGELOG.md'), 'utf8');
  const section = extractVersionSection(changelog, packageVersion);
  if (section) {
    const notes = formatReleaseNotes(packageVersion, section);
    releaseNotesPass = true;
    notesPreview = notes.split('\n')[0];
  }
} catch {
  releaseNotesPass = false;
}

const packageDryRun = buildPackageDryRun();
const alignment = buildReleaseAlignment(packageName, packageVersion);
const pass = releaseNotesPass && packageDryRun.pass && alignment.pass;

const reportLines = [
  `RepoBelt release preflight: ${pass ? 'PASS' : 'FAIL'}`,
  `package: ${packageName}@${packageVersion}`,
  `release notes: ${releaseNotesPass ? 'ok' : 'fail'}`,
  `notes preview: ${notesPreview}`,
  `package dry-run: ok`,
  `tarball: ${packageDryRun.filename}`,
  `package size: ${packageDryRun.packageSize} bytes`,
  `unpacked size: ${packageDryRun.unpackedSize} bytes`,
  `total files: ${packageDryRun.totalFiles}`,
  `release alignment: ${alignment.pass ? 'ok' : 'fail'}`,
  ...alignment.lines,
];

if (!pass) {
  reportLines.push('recommendation: create the matching version tag at HEAD with a clean working tree before publishing; do not publish without explicit maintainer approval.');
}

const report = `${reportLines.join('\n')}\n`;
process.stdout.write(report);

process.exit(pass ? 0 : 1);
