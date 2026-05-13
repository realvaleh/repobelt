import type { CheckResult } from '../check/run-check.js';

export function renderMarkdownReport(result: CheckResult): string {
  const lines: string[] = [];

  lines.push('# RepoBelt Report');
  lines.push('');
  lines.push(`**Status:** ${result.status.toUpperCase()}`);
  lines.push('');
  lines.push(`Changed files: ${result.changedFiles.length}`);
  lines.push('');

  if (result.pathPolicy.blocked.length > 0) {
    lines.push('## Blocked files');
    lines.push('');
    for (const finding of result.pathPolicy.blocked) {
      lines.push(`- \`${finding.path}\` matched \`${finding.matchedPattern}\``);
    }
    lines.push('');
  }

  if (result.pathPolicy.risky.length > 0) {
    lines.push('## Risky files');
    lines.push('');
    for (const finding of result.pathPolicy.risky) {
      lines.push(`- \`${finding.path}\` matched \`${finding.matchedPattern}\` and requires review`);
    }
    lines.push('');
  }

  if (result.secretFindings.length > 0) {
    lines.push('## Secret findings');
    lines.push('');
    for (const finding of result.secretFindings) {
      lines.push(`- \`${finding.path}:${finding.line}\` \`${finding.kind}\` matched ${finding.matchedPattern}`);
    }
    lines.push('');
  }

  if (result.reviewerHints.length > 0) {
    lines.push('## Reviewer hints');
    lines.push('');
    for (const hint of result.reviewerHints) {
      lines.push(`- \`${hint.path}\` matched \`${hint.matchedPattern}\`: ${hint.owners.join(', ')}`);
    }
    lines.push('');
  }

  if (result.requiredChecks.length > 0) {
    lines.push('## Required checks');
    lines.push('');
    for (const check of result.requiredChecks) {
      lines.push(`- \`${check}\``);
    }
    lines.push('');
  }

  if (result.status === 'pass') {
    lines.push('No blocked paths, risky paths, or secrets found.');
    lines.push('');
  }

  lines.push('## Reviewer action');
  lines.push('');
  lines.push(reviewerAction(result));

  return `${lines.join('\n').trimEnd()}\n`;
}

function reviewerAction(result: CheckResult): string {
  if (result.status === 'fail') {
    return 'Do not merge until blocked findings are resolved.';
  }

  if (result.status === 'warn') {
    return 'Review risky files before merging.';
  }

  return 'RepoBelt found no policy violations.';
}
