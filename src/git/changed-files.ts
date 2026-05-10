import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ChangedFilesOptions {
  cwd: string;
  base: string;
  head: string;
}

export async function getChangedFiles(options: ChangedFilesOptions): Promise<string[]> {
  if (options.head === 'worktree') {
    const [{ stdout: trackedStdout }, { stdout: untrackedStdout }] = await Promise.all([
      execFileAsync('git', ['diff', '--name-only', options.base], { cwd: options.cwd }),
      execFileAsync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: options.cwd }),
    ]);
    return uniqueSortedLines(`${trackedStdout}\n${untrackedStdout}`);
  }

  const { stdout } = await execFileAsync('git', ['diff', '--name-only', options.base, options.head], {
    cwd: options.cwd,
  });
  return uniqueSortedLines(stdout);
}

function uniqueSortedLines(output: string): string[] {
  return Array.from(new Set(output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)))
    .sort();
}
