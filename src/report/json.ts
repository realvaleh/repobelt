import type { CheckResult } from '../check/run-check.js';

export function renderJsonReport(result: CheckResult): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}
