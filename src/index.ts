import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import { describeInitPresets, generateInitFiles, supportedInitPresets, writeInitFiles, type InitPreset } from './commands/init.js';
import { runCheck } from './check/run-check.js';
import { renderGitHubActionsReport } from './report/github-actions.js';
import { renderJsonReport } from './report/json.js';
import { renderMarkdownReport } from './report/markdown.js';
import { renderSarifReport } from './report/sarif.js';

export interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

export interface CliResult {
  exitCode: number;
}

export interface CliRuntime {
  cwd: string;
  stdin?: () => Promise<string>;
}

export function getHelpText(): string {
  return `RepoBelt — A seatbelt for AI-generated pull requests.

Usage: repobelt <command>

Commands:
  init     Create a starter .repobelt.yml and GitHub Action workflow
  check    Check a git diff against the RepoBelt policy

Options:
  --preset <${formatInitPresetChoices()}>  Policy preset for init. Default: default
  --list-presets          List available init presets
  -h, --help              Show this help message
`;
}

export function getCheckHelpText(): string {
  return `RepoBelt check — inspect changed files against the RepoBelt policy.

Usage: repobelt check [options]

Options:
  --base <ref>                    Base git ref. Default: HEAD
  --head <ref|worktree>           Head git ref or worktree. Default: worktree
  --format <text|markdown|json|sarif|github>   Output format. Default: text
  --output <path>                  Write report to a file instead of stdout
  --config <path>                  Policy file path. Default: .repobelt.yml
  --changed-files <path>           Newline-delimited changed-file list instead of git diff discovery
  --stdin-changed-files            Read newline-delimited changed-file list from stdin
  --max-files <n>                  Fail when changed file count exceeds n
  --max-risky <n>                  Fail when risky file count exceeds n
  --fail-on-warn                  Exit 1 when risky paths produce warnings
  -h, --help                      Show this help message
`;
}

export async function runCli(
  args: string[],
  io: CliIo = defaultIo,
  runtime: CliRuntime = { cwd: process.cwd() },
): Promise<CliResult> {
  const [command] = args;

  if (command === undefined || command === '--help' || command === '-h') {
    io.stdout(getHelpText());
    return { exitCode: 0 };
  }

  if (command === 'init' && args.includes('--dry-run')) {
    const preset = getInitPreset(args, io);
    if (preset === undefined) {
      return { exitCode: 1 };
    }
    const files = generateInitFiles({ preset });
    io.stdout('RepoBelt would create:');
    for (const path of Object.keys(files)) {
      io.stdout(`- ${path}`);
    }
    return { exitCode: 0 };
  }

  if (command === 'init' && args.includes('--list-presets')) {
    io.stdout(formatInitPresetDescriptions());
    return { exitCode: 0 };
  }

  if (command === 'init') {
    const preset = getInitPreset(args, io);
    if (preset === undefined) {
      return { exitCode: 1 };
    }
    try {
      const result = await writeInitFiles(runtime.cwd, { preset });
      for (const path of result.created) {
        io.stdout(`Created ${path}`);
      }
      return { exitCode: 0 };
    } catch (error) {
      io.stderr(`RepoBelt init failed: ${error instanceof Error ? error.message : String(error)}`);
      return { exitCode: 1 };
    }
  }

  if (command === 'check') {
    if (args.includes('--help') || args.includes('-h')) {
      io.stdout(getCheckHelpText());
      return { exitCode: 0 };
    }

    const base = getFlagValue(args, '--base') ?? 'HEAD';
    const head = getFlagValue(args, '--head') ?? 'worktree';
    const format = getFlagValue(args, '--format') ?? 'text';
    const output = getFlagValue(args, '--output');
    const config = getFlagValue(args, '--config');
    const changedFilesPath = getFlagValue(args, '--changed-files');
    const readChangedFilesFromStdin = args.includes('--stdin-changed-files');
    const maxFilesValue = getFlagValue(args, '--max-files');
    const maxRiskyValue = getFlagValue(args, '--max-risky');
    const failOnWarn = args.includes('--fail-on-warn');
    if (isMissingFlagValue(args, '--config')) {
      io.stderr('Missing value for --config');
      return { exitCode: 1 };
    }
    if (isMissingFlagValue(args, '--changed-files')) {
      io.stderr('Missing value for --changed-files');
      return { exitCode: 1 };
    }
    if (changedFilesPath !== undefined && readChangedFilesFromStdin) {
      io.stderr('Use only one of --changed-files or --stdin-changed-files');
      return { exitCode: 1 };
    }
    if (isMissingFlagValue(args, '--max-files')) {
      io.stderr('Missing value for --max-files');
      return { exitCode: 1 };
    }
    const maxFiles = parseMaxFiles(maxFilesValue);
    if (maxFilesValue !== undefined && maxFiles === undefined) {
      io.stderr(`Invalid value for --max-files: ${maxFilesValue}`);
      io.stderr('--max-files must be a positive integer');
      return { exitCode: 1 };
    }
    if (isMissingFlagValue(args, '--max-risky')) {
      io.stderr('Missing value for --max-risky');
      return { exitCode: 1 };
    }
    const maxRisky = parseMaxRisky(maxRiskyValue);
    if (maxRiskyValue !== undefined && maxRisky === undefined) {
      io.stderr(`Invalid value for --max-risky: ${maxRiskyValue}`);
      io.stderr('--max-risky must be a non-negative integer');
      return { exitCode: 1 };
    }
    if (!isSupportedFormat(format)) {
      io.stderr(`Unsupported format: ${format}`);
      io.stderr('Supported formats: text, markdown, json, sarif, github');
      return { exitCode: 1 };
    }
    let result;
    try {
      const policyText = await readPolicyText(runtime.cwd, config);
      const changedFiles = await readChangedFilesOverride(runtime, changedFilesPath, readChangedFilesFromStdin);
      result = await runCheck({
        cwd: runtime.cwd,
        base,
        head,
        policyText,
        changedFilesProvider: changedFiles === undefined ? undefined : async () => changedFiles,
      });
    } catch (error) {
      io.stderr(`RepoBelt check failed: ${formatError(error)}`);
      return { exitCode: 1 };
    }

    if (output !== undefined) {
      await writeOutputFile(resolveOutputPath(runtime.cwd, output), renderCheckOutput(result, format));
      io.stdout(`Wrote RepoBelt report to ${output}`);
      return { exitCode: getCheckExitCode(result, failOnWarn, maxFiles, maxRisky) };
    }

    if (format === 'markdown') {
      io.stdout(renderMarkdownReport(result));
      return { exitCode: getCheckExitCode(result, failOnWarn, maxFiles, maxRisky) };
    }

    if (format === 'json') {
      io.stdout(renderJsonReport(result));
      return { exitCode: getCheckExitCode(result, failOnWarn, maxFiles, maxRisky) };
    }

    if (format === 'sarif') {
      io.stdout(renderSarifReport(result));
      return { exitCode: getCheckExitCode(result, failOnWarn, maxFiles, maxRisky) };
    }

    if (format === 'github') {
      io.stdout(renderGitHubActionsReport(result));
      return { exitCode: getCheckExitCode(result, failOnWarn, maxFiles, maxRisky) };
    }

    if (isMaxFilesExceeded(result, maxFiles)) {
      io.stdout('RepoBelt check failed');
      io.stdout(`Too many changed files: ${result.changedFiles.length} exceeds max ${maxFiles}`);
      writeReviewerHints(result, io);
      writeRequiredChecks(result, io);
      return { exitCode: 1 };
    }

    if (isMaxRiskyExceeded(result, maxRisky)) {
      io.stdout('RepoBelt check failed');
      io.stdout(`Too many risky files: ${result.pathPolicy.risky.length} exceeds max ${maxRisky}`);
      writeReviewerHints(result, io);
      writeRequiredChecks(result, io);
      return { exitCode: 1 };
    }

    if (result.status === 'fail') {
      io.stdout('RepoBelt check failed');
      for (const finding of result.pathPolicy.blocked) {
        io.stdout(`Blocked: ${finding.path} matched ${finding.matchedPattern}`);
      }
      for (const finding of result.secretFindings) {
        io.stdout(`Secret: ${finding.path}:${finding.line} ${finding.kind} matched ${finding.matchedPattern}`);
      }
      writeReviewerHints(result, io);
      writeRequiredChecks(result, io);
      return { exitCode: 1 };
    }

    if (result.status === 'warn') {
      io.stdout('RepoBelt check passed with warnings');
      for (const finding of result.pathPolicy.risky) {
        io.stdout(`Risky: ${finding.path} matched ${finding.matchedPattern}`);
      }
      writeReviewerHints(result, io);
      writeRequiredChecks(result, io);
      return { exitCode: getCheckExitCode(result, failOnWarn, maxFiles, maxRisky) };
    }

    io.stdout('RepoBelt check passed');
    writeReviewerHints(result, io);
    writeRequiredChecks(result, io);
    return { exitCode: 0 };
  }

  io.stderr(`Unknown command: ${command}`);
  io.stderr(getHelpText());
  return { exitCode: 1 };
}

const defaultIo: CliIo = {
  stdout: (message) => process.stdout.write(`${message}\n`),
  stderr: (message) => process.stderr.write(`${message}\n`),
};

function getCheckExitCode(
  result: Awaited<ReturnType<typeof runCheck>>,
  failOnWarn: boolean,
  maxFiles?: number,
  maxRisky?: number,
): number {
  if (
    result.status === 'fail' ||
    (failOnWarn && result.status === 'warn') ||
    isMaxFilesExceeded(result, maxFiles) ||
    isMaxRiskyExceeded(result, maxRisky)
  ) {
    return 1;
  }
  return 0;
}

function isMaxFilesExceeded(result: Awaited<ReturnType<typeof runCheck>>, maxFiles: number | undefined): boolean {
  return maxFiles !== undefined && result.changedFiles.length > maxFiles;
}

function isMaxRiskyExceeded(result: Awaited<ReturnType<typeof runCheck>>, maxRisky: number | undefined): boolean {
  return maxRisky !== undefined && result.pathPolicy.risky.length > maxRisky;
}

function renderCheckOutput(result: Awaited<ReturnType<typeof runCheck>>, format: string): string {
  if (format === 'markdown') {
    return renderMarkdownReport(result);
  }
  if (format === 'json') {
    return renderJsonReport(result);
  }
  if (format === 'sarif') {
    return renderSarifReport(result);
  }
  if (format === 'github') {
    return renderGitHubActionsReport(result);
  }
  return renderTextReport(result);
}

function renderTextReport(result: Awaited<ReturnType<typeof runCheck>>): string {
  const lines: string[] = [];
  if (result.status === 'fail') {
    lines.push('RepoBelt check failed');
    for (const finding of result.pathPolicy.blocked) {
      lines.push(`Blocked: ${finding.path} matched ${finding.matchedPattern}`);
    }
    for (const finding of result.secretFindings) {
      lines.push(`Secret: ${finding.path}:${finding.line} ${finding.kind} matched ${finding.matchedPattern}`);
    }
  } else if (result.status === 'warn') {
    lines.push('RepoBelt check passed with warnings');
    for (const finding of result.pathPolicy.risky) {
      lines.push(`Risky: ${finding.path} matched ${finding.matchedPattern}`);
    }
  } else {
    lines.push('RepoBelt check passed');
  }
  for (const hint of result.reviewerHints) {
    lines.push(`Reviewer: ${hint.path} matched ${hint.matchedPattern} -> ${hint.owners.join(', ')}`);
  }
  if (result.requiredChecks.length > 0) {
    lines.push(`Required checks: ${result.requiredChecks.join(', ')}`);
  }
  return `${lines.join('\n')}\n`;
}

function resolveOutputPath(cwd: string, output: string): string {
  return isAbsolute(output) ? output : join(cwd, output);
}

async function writeOutputFile(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

function writeReviewerHints(result: Awaited<ReturnType<typeof runCheck>>, io: CliIo): void {
  for (const hint of result.reviewerHints) {
    io.stdout(`Reviewer: ${hint.path} matched ${hint.matchedPattern} -> ${hint.owners.join(', ')}`);
  }
}

function writeRequiredChecks(result: Awaited<ReturnType<typeof runCheck>>, io: CliIo): void {
  if (result.requiredChecks.length > 0) {
    io.stdout(`Required checks: ${result.requiredChecks.join(', ')}`);
  }
}

function getFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function isMissingFlagValue(args: string[], flag: string): boolean {
  const index = args.indexOf(flag);
  return index >= 0 && (args[index + 1] === undefined || args[index + 1]?.startsWith('--') === true);
}

function getInitPreset(args: string[], io: CliIo): InitPreset | undefined {
  const presetIndex = args.indexOf('--preset');
  if (presetIndex >= 0 && (args[presetIndex + 1] === undefined || args[presetIndex + 1]?.startsWith('--'))) {
    io.stderr('Missing value for --preset');
    io.stderr(`Supported presets: ${formatInitPresetList()}`);
    return undefined;
  }

  const preset = getFlagValue(args, '--preset') ?? 'default';
  if (isInitPreset(preset)) {
    return preset;
  }
  io.stderr(`Unsupported init preset: ${preset}`);
  io.stderr(`Supported presets: ${formatInitPresetList()}`);
  return undefined;
}

function isInitPreset(value: string): value is InitPreset {
  return supportedInitPresets.includes(value as InitPreset);
}

function formatInitPresetChoices(): string {
  return supportedInitPresets.join('|');
}

function formatInitPresetList(): string {
  return supportedInitPresets.join(', ');
}

function formatInitPresetDescriptions(): string {
  const presets = describeInitPresets();
  const nameWidth = Math.max(...presets.map((preset) => preset.name.length));
  const lines = presets.map((preset) => `${preset.name.padEnd(nameWidth)} ${preset.description}`);
  return ['Available RepoBelt init presets:', ...lines].join('\n');
}

function isSupportedFormat(format: string): boolean {
  return ['text', 'markdown', 'json', 'sarif', 'github'].includes(format);
}

function parseMaxFiles(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return parsed > 0 ? parsed : undefined;
}

function parseMaxRisky(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^\d+$/.test(value)) {
    return undefined;
  }
  return Number(value);
}

async function readOptionalText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

async function readPolicyText(cwd: string, config: string | undefined): Promise<string | undefined> {
  const configPath = config === undefined ? join(cwd, '.repobelt.yml') : resolveOutputPath(cwd, config);
  return config === undefined ? readOptionalText(configPath) : readFile(configPath, 'utf8');
}

async function readChangedFilesList(cwd: string, changedFilesPath: string): Promise<string[]> {
  const text = await readFile(resolveOutputPath(cwd, changedFilesPath), 'utf8');
  return parseChangedFilesText(text);
}

async function readChangedFilesOverride(
  runtime: CliRuntime,
  changedFilesPath: string | undefined,
  readChangedFilesFromStdin: boolean,
): Promise<string[] | undefined> {
  if (changedFilesPath !== undefined) {
    return readChangedFilesList(runtime.cwd, changedFilesPath);
  }
  if (readChangedFilesFromStdin) {
    return parseChangedFilesText(await readStdin(runtime));
  }
  return undefined;
}

function parseChangedFilesText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function readStdin(runtime: CliRuntime): Promise<string> {
  if (runtime.stdin !== undefined) {
    return runtime.stdin();
  }

  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    text += chunk;
  }
  return text;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : '';
    return stderr.length > 0 ? stderr : error.message;
  }
  return String(error);
}
