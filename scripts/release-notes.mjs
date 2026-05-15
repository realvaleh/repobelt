#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function fail(message) {
  console.error(`RepoBelt release notes failed: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { output: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--') {
      continue;
    }

    if (arg === '--output') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        fail('--output requires a file path.');
      }
      args.output = value;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: pnpm release:notes [-- --output <path>]\n\nGenerates GitHub release notes from the CHANGELOG.md section for the current package.json version.\nThis command is read-only unless --output is provided. It does not create tags, edit GitHub releases, or publish packages.`);
      process.exit(0);
    }

    fail(`Unknown option: ${arg}`);
  }

  return args;
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

const args = parseArgs(process.argv.slice(2));
const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8'));
const version = packageJson.version;

if (!version) {
  fail('package.json is missing a version.');
}

const changelog = await readFile(resolve('CHANGELOG.md'), 'utf8');
const section = extractVersionSection(changelog, version);

if (!section) {
  fail(`No CHANGELOG.md section found for version ${version}.`);
}

const notes = formatReleaseNotes(version, section);

if (args.output) {
  const outputPath = resolve(args.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, notes);
  console.log(`Wrote release notes to ${outputPath}`);
} else {
  process.stdout.write(notes);
}
