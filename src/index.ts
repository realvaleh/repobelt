import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { generateInitFiles, writeInitFiles } from './commands/init.js';
import { runCheck } from './check/run-check.js';
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
}

export function getHelpText(): string {
  return `RepoBelt — A seatbelt for AI-generated pull requests.

Usage: repobelt <command>

Commands:
  init     Create a starter .repobelt.yml and GitHub Action workflow
  check    Check a git diff against the RepoBelt policy

Options:
  -h, --help    Show this help message
`;
}

export function getCheckHelpText(): string {
  return `RepoBelt check — inspect changed files against the RepoBelt policy.

Usage: repobelt check [options]

Options:
  --base <ref>                    Base git ref. Default: HEAD
  --head <ref|worktree>           Head git ref or worktree. Default: worktree
  --format <text|markdown|json|sarif>   Output format. Default: text
  --output <path>                  Write report to a file instead of stdout
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
    const files = generateInitFiles();
    io.stdout('RepoBelt would create:');
    for (const path of Object.keys(files)) {
      io.stdout(`- ${path}`);
    }
    return { exitCode: 0 };
  }

  if (command === 'init') {
    try {
      const result = await writeInitFiles(runtime.cwd);
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
    if (!isSupportedFormat(format)) {
      io.stderr(`Unsupported format: ${format}`);
      io.stderr('Supported formats: text, markdown, json, sarif');
      return { exitCode: 1 };
    }
    const policyText = await readOptionalText(join(runtime.cwd, '.repobelt.yml'));
    let result;
    try {
      result = await runCheck({ cwd: runtime.cwd, base, head, policyText });
    } catch (error) {
      io.stderr(`RepoBelt check failed: ${formatError(error)}`);
      return { exitCode: 1 };
    }

    if (output !== undefined) {
      await writeOutputFile(join(runtime.cwd, output), renderCheckOutput(result, format));
      io.stdout(`Wrote RepoBelt report to ${output}`);
      return { exitCode: result.status === 'fail' ? 1 : 0 };
    }

    if (format === 'markdown') {
      io.stdout(renderMarkdownReport(result));
      return { exitCode: result.status === 'fail' ? 1 : 0 };
    }

    if (format === 'json') {
      io.stdout(renderJsonReport(result));
      return { exitCode: result.status === 'fail' ? 1 : 0 };
    }

    if (format === 'sarif') {
      io.stdout(renderSarifReport(result));
      return { exitCode: result.status === 'fail' ? 1 : 0 };
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
      return { exitCode: 1 };
    }

    if (result.status === 'warn') {
      io.stdout('RepoBelt check passed with warnings');
      for (const finding of result.pathPolicy.risky) {
        io.stdout(`Risky: ${finding.path} matched ${finding.matchedPattern}`);
      }
      writeReviewerHints(result, io);
      return { exitCode: 0 };
    }

    io.stdout('RepoBelt check passed');
    writeReviewerHints(result, io);
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
  return `${lines.join('\n')}\n`;
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

function getFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function isSupportedFormat(format: string): boolean {
  return ['text', 'markdown', 'json', 'sarif'].includes(format);
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

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const stderr = 'stderr' in error && typeof error.stderr === 'string' ? error.stderr.trim() : '';
    return stderr.length > 0 ? stderr : error.message;
  }
  return String(error);
}
