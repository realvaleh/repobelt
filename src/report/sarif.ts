import type { CheckResult } from '../check/run-check.js';

interface SarifLog {
  version: '2.1.0';
  $schema: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: 'RepoBelt';
      informationUri: string;
      rules: SarifRule[];
    };
  };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  help: { text: string };
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning';
  message: { text: string };
  locations: SarifLocation[];
}

interface SarifLocation {
  physicalLocation: {
    artifactLocation: { uri: string };
    region?: { startLine: number };
  };
}

const rules: SarifRule[] = [
  {
    id: 'repobelt/protected-path',
    name: 'Protected path changed',
    shortDescription: { text: 'A protected path was changed.' },
    help: { text: 'Protected paths should not be changed by AI-generated pull requests without deliberate maintainer intervention.' },
  },
  {
    id: 'repobelt/risky-path',
    name: 'Risky path changed',
    shortDescription: { text: 'A risky path was changed.' },
    help: { text: 'Risky paths are allowed, but require focused human review before merging.' },
  },
  {
    id: 'repobelt/secret-finding',
    name: 'Secret-shaped value detected',
    shortDescription: { text: 'A secret-shaped value was detected.' },
    help: { text: 'Secret findings report the location and pattern type without printing the matched value.' },
  },
];

export function renderSarifReport(result: CheckResult): string {
  const log: SarifLog = {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'RepoBelt',
            informationUri: 'https://github.com/realvaleh/repobelt',
            rules,
          },
        },
        results: sarifResults(result),
      },
    ],
  };

  return `${JSON.stringify(log, null, 2)}\n`;
}

function sarifResults(result: CheckResult): SarifResult[] {
  return [
    ...result.pathPolicy.blocked.map((finding): SarifResult => ({
      ruleId: 'repobelt/protected-path',
      level: 'error',
      message: { text: `Protected path matched ${finding.matchedPattern}` },
      locations: [locationForPath(finding.path)],
    })),
    ...result.pathPolicy.risky.map((finding): SarifResult => ({
      ruleId: 'repobelt/risky-path',
      level: 'warning',
      message: { text: `Risky path matched ${finding.matchedPattern} and requires review` },
      locations: [locationForPath(finding.path)],
    })),
    ...result.secretFindings.map((finding): SarifResult => ({
      ruleId: 'repobelt/secret-finding',
      level: 'error',
      message: { text: `Secret-shaped value matched ${finding.matchedPattern}` },
      locations: [locationForPath(finding.path, finding.line)],
    })),
  ];
}

function locationForPath(path: string, line?: number): SarifLocation {
  return {
    physicalLocation: {
      artifactLocation: { uri: path },
      ...(line === undefined ? {} : { region: { startLine: line } }),
    },
  };
}
