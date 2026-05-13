import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface InitWriteResult {
  created: string[];
}

const baseRiskyPaths = [
  'auth/**: require_review',
  'payments/**: require_review',
  'migrations/**: require_review',
  'infra/prod/**: require_review',
  '.github/workflows/**: require_review',
];

const packageRiskyPaths = ['package.json: require_review', 'pnpm-lock.yaml: require_review', 'package-lock.json: require_review'];
const baseRequiredChecks = ['test', 'lint', 'typecheck'];

type InitPresetDefinition = {
  description: string;
  riskyPaths: string[];
  requiredChecks: string[];
};

const presetDefinitions = {
  default: {
    description: 'Baseline policy for any repository',
    riskyPaths: [],
    requiredChecks: [],
  },
  web: {
    description: 'Frontend and full-stack web apps with API routes and build checks',
    riskyPaths: [
      ...packageRiskyPaths,
      'app/api/**: require_review',
      'pages/api/**: require_review',
      'src/app/api/**: require_review',
      'middleware.*: require_review',
      'next.config.*: require_review',
      'vite.config.*: require_review',
    ],
    requiredChecks: ['build'],
  },
  node: {
    description: 'Node.js and TypeScript packages with package, CLI, and script review paths',
    riskyPaths: [
      ...packageRiskyPaths,
      'tsconfig*.json: require_review',
      'src/cli.*: require_review',
      'bin/**: require_review',
      'scripts/**: require_review',
    ],
    requiredChecks: ['build'],
  },
  python: {
    description: 'Python services and packages with dependency and migration review paths',
    riskyPaths: [
      'pyproject.toml: require_review',
      'requirements*.txt: require_review',
      'poetry.lock: require_review',
      'uv.lock: require_review',
      'Pipfile.lock: require_review',
      'alembic/**: require_review',
      'migrations/**: require_review',
      'scripts/**: require_review',
    ],
    requiredChecks: ['build'],
  },
  infra: {
    description: 'Infrastructure-as-code repositories with Terraform, Kubernetes, Docker, and plan checks',
    riskyPaths: [
      '**/*.tf: require_review',
      '**/*.tfvars: require_review',
      'terraform/**: require_review',
      'infra/**: require_review',
      'k8s/**: require_review',
      'kubernetes/**: require_review',
      'helm/**: require_review',
      'Dockerfile*: require_review',
      'docker-compose*.yml: require_review',
      'docker-compose*.yaml: require_review',
      '.github/workflows/**: require_review',
    ],
    requiredChecks: ['plan'],
  },
  monorepo: {
    description: 'Workspace repositories with shared tooling, package boundaries, and affected checks',
    riskyPaths: [
      ...packageRiskyPaths,
      'pnpm-workspace.yaml: require_review',
      'turbo.json: require_review',
      'nx.json: require_review',
      'lerna.json: require_review',
      'rush.json: require_review',
      'packages/*/package.json: require_review',
      'apps/*/package.json: require_review',
      'libs/*/package.json: require_review',
      'tools/**: require_review',
      'config/**: require_review',
    ],
    requiredChecks: ['build', 'affected'],
  },
} satisfies Record<string, InitPresetDefinition>;

export const supportedInitPresets = Object.keys(presetDefinitions) as InitPreset[];

export type InitPreset = keyof typeof presetDefinitions;

export interface InitPresetDescription {
  name: InitPreset;
  description: string;
}

export interface InitOptions {
  preset?: InitPreset;
  prComment?: boolean;
  strict?: boolean;
}

export function describeInitPresets(): InitPresetDescription[] {
  return supportedInitPresets.map((name) => ({ name, description: presetDefinitions[name].description }));
}

export function generateInitFiles(options: InitOptions = {}): Record<string, string> {
  const policy = renderPolicy(options.preset ?? 'default', options);

  return {
    '.repobelt.yml': policy,
    '.github/workflows/repobelt.yml': renderWorkflow(options),
  };
}

function renderWorkflow(options: InitOptions): string {
  const issuesPermission = options.prComment === true ? '      issues: write\n' : '';
  const prCommentEnv = options.prComment === true ? '        env:\n          GH_TOKEN: ${{ github.token }}\n' : '';
  const checkCommand = renderWorkflowCheckCommand(options);

  return `name: RepoBelt

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  repobelt:
    name: RepoBelt safety check
    runs-on: ubuntu-latest
    env:
      FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
    permissions:
      contents: read
      pull-requests: read
${issuesPermission}    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 20
      - name: Run RepoBelt
${prCommentEnv}        run: |
${checkCommand}
`;
}

function renderWorkflowCheckCommand(options: InitOptions): string {
  const lines = [
    '          npx repobelt check',
    options.strict === true ? '            --since-default' : '            --diff "origin/$GITHUB_BASE_REF...$GITHUB_SHA"',
    '            --format github',
    '            --summary "$GITHUB_STEP_SUMMARY"',
  ];

  if (options.strict === true) {
    lines.push(
      '            --fail-on-warn',
      '            --codeowners-diagnostics-fail',
      '            --max-files 50',
      '            --max-risky 0',
      '            --max-secrets 0',
    );
  }

  if (options.prComment === true) {
    lines.push('            --pr-comment auto');
  }

  return lines.map((line, index) => (index === lines.length - 1 ? line : `${line} \\`)).join('\n');
}

export async function writeInitFiles(targetDirectory: string, options: InitOptions = {}): Promise<InitWriteResult> {
  const files = generateInitFiles(options);
  const created: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(targetDirectory, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, { encoding: 'utf8', flag: 'wx' });
    created.push(relativePath);
  }

  return { created };
}

function renderPolicy(preset: InitPreset, options: InitOptions): string {
  const presetDefinition = presetDefinitions[preset];
  const presetComment = preset === 'default' ? '' : `# Preset: ${preset}\n`;
  const riskyPaths = [...baseRiskyPaths, ...presetDefinition.riskyPaths];
  const requiredChecks = [...baseRequiredChecks, ...presetDefinition.requiredChecks];
  const strictLimits = options.strict === true ? `
limits:
  max_files: 50
  max_risky: 0
  max_secrets: 0
` : '';

  return `version: 1
${presetComment}
# Files that should fail CI when changed by an AI-generated PR unless policy is edited.
protected_paths:
  - .env
  - .env.*
  - secrets/**
  - '**/*.pem'
  - '**/*.key'

# Files that are allowed but should receive explicit human review.
risky_paths:
${riskyPaths.map((path) => `  ${path}`).join('\n')}

required_checks:
${requiredChecks.map((check) => `  - ${check}`).join('\n')}

allowlist:
  paths: []
${strictLimits}`;
}
