import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateInitFiles, writeInitFiles } from './commands/init.js';
import { runCheck } from './check/run-check.js';
import { renderJsonReport } from './report/json.js';
import { renderMarkdownReport } from './report/markdown.js';

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
  --format <text|markdown|json>   Output format. Default: text
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
    if (!isSupportedFormat(format)) {
      io.stderr(`Unsupported format: ${format}`);
      io.stderr('Supported formats: text, markdown, json');
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

    if (format === 'markdown') {
      io.stdout(renderMarkdownReport(result));
      return { exitCode: result.status === 'fail' ? 1 : 0 };
    }

    if (format === 'json') {
      io.stdout(renderJsonReport(result));
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
      return { exitCode: 1 };
    }

    if (result.status === 'warn') {
      io.stdout('RepoBelt check passed with warnings');
      for (const finding of result.pathPolicy.risky) {
        io.stdout(`Risky: ${finding.path} matched ${finding.matchedPattern}`);
      }
      return { exitCode: 0 };
    }

    io.stdout('RepoBelt check passed');
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

function getFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function isSupportedFormat(format: string): boolean {
  return ['text', 'markdown', 'json'].includes(format);
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
