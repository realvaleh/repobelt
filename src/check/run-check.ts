import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getChangedFiles } from '../git/changed-files.js';
import { loadPolicyFromText } from '../policy/load-policy.js';
import { findCodeOwnerHints, type CodeOwnerHint } from '../rules/codeowners.js';
import { classifyChangedFiles, type PathPolicyResult, type PathPolicyStatus } from '../rules/path-policy.js';
import { scanTextForSecrets, type SecretFinding } from '../rules/secrets.js';

export interface RunCheckOptions {
  cwd: string;
  base: string;
  head: string;
  policyText?: string;
  codeownersText?: string;
  changedFilesProvider?: (options: { cwd: string; base: string; head: string }) => Promise<string[]>;
  fileContentProvider?: (path: string, options: { cwd: string }) => Promise<string | undefined>;
}

export interface CheckResult {
  status: PathPolicyStatus;
  changedFiles: string[];
  pathPolicy: PathPolicyResult;
  secretFindings: SecretFinding[];
  reviewerHints: CodeOwnerHint[];
}

export async function runCheck(options: RunCheckOptions): Promise<CheckResult> {
  const policy = loadPolicyFromText(options.policyText);
  const changedFilesProvider = options.changedFilesProvider ?? getChangedFiles;
  const fileContentProvider = options.fileContentProvider ?? readWorkingTreeFile;
  const changedFiles = await changedFilesProvider({ cwd: options.cwd, base: options.base, head: options.head });
  const pathPolicy = classifyChangedFiles(changedFiles, policy);
  const secretFindings = await scanChangedFilesForSecrets(changedFiles, options.cwd, fileContentProvider);
  const codeownersText = options.codeownersText ?? (await readCodeOwnersFile(options.cwd));
  const reviewerHints = findCodeOwnerHints({ changedFiles, codeownersText });

  return {
    status: secretFindings.length > 0 ? 'fail' : pathPolicy.status,
    changedFiles,
    pathPolicy,
    secretFindings,
    reviewerHints,
  };
}

async function scanChangedFilesForSecrets(
  paths: string[],
  cwd: string,
  fileContentProvider: (path: string, options: { cwd: string }) => Promise<string | undefined>,
): Promise<SecretFinding[]> {
  const findings: SecretFinding[] = [];

  for (const path of paths) {
    const text = await fileContentProvider(path, { cwd });
    if (text !== undefined) {
      findings.push(...scanTextForSecrets({ path, text }));
    }
  }

  return findings;
}

async function readCodeOwnersFile(cwd: string): Promise<string | undefined> {
  for (const path of ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']) {
    const text = await readOptionalText(join(cwd, path));
    if (text !== undefined) {
      return text;
    }
  }
  return undefined;
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

async function readWorkingTreeFile(path: string, options: { cwd: string }): Promise<string | undefined> {
  try {
    return await readFile(join(options.cwd, path), 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
