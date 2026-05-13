import type { CheckResult } from '../check/run-check.js';

export function renderGitHubActionsReport(result: CheckResult): string {
  const lines: string[] = [];

  for (const finding of result.pathPolicy.blocked) {
    lines.push(annotation({
      command: 'error',
      properties: { file: finding.path, title: 'RepoBelt protected path' },
      message: `${finding.path} matched ${finding.matchedPattern}`,
    }));
  }

  for (const finding of result.secretFindings) {
    lines.push(annotation({
      command: 'error',
      properties: { file: finding.path, line: String(finding.line), title: 'RepoBelt secret finding' },
      message: `${finding.kind} matched ${finding.matchedPattern}`,
    }));
  }

  for (const finding of result.pathPolicy.risky) {
    lines.push(annotation({
      command: 'warning',
      properties: { file: finding.path, title: 'RepoBelt risky path' },
      message: `${finding.path} matched ${finding.matchedPattern} and requires review`,
    }));
  }

  for (const hint of result.reviewerHints) {
    lines.push(annotation({
      command: 'notice',
      properties: { file: hint.path, title: 'RepoBelt reviewer hint' },
      message: `${hint.path} matched ${hint.matchedPattern} -> ${hint.owners.join(', ')}`,
    }));
  }

  if (result.requiredChecks.length > 0) {
    lines.push(annotation({
      command: 'notice',
      properties: { title: 'RepoBelt required checks' },
      message: result.requiredChecks.join(', '),
    }));
  }

  if (lines.length === 0) {
    lines.push(annotation({
      command: 'notice',
      properties: { title: 'RepoBelt check passed' },
      message: `Checked ${result.changedFiles.length} changed file${result.changedFiles.length === 1 ? '' : 's'}`,
    }));
  }

  return `${lines.join('\n')}\n`;
}

function annotation(options: { command: string; properties: Record<string, string>; message: string }): string {
  const properties = Object.entries(options.properties)
    .map(([key, value]) => `${key}=${escapeAnnotationProperty(value)}`)
    .join(',');
  return `::${options.command} ${properties}::${escapeAnnotationMessage(options.message)}`;
}

function escapeAnnotationProperty(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

function escapeAnnotationMessage(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A');
}
