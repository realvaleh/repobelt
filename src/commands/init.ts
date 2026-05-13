import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface InitWriteResult {
  created: string[];
}

export type InitPreset = 'default' | 'web' | 'node';

export interface InitOptions {
  preset?: InitPreset;
}

export function generateInitFiles(options: InitOptions = {}): Record<string, string> {
  const policy = renderPolicy(options.preset ?? 'default');

  return {
    '.repobelt.yml': policy,
    '.github/workflows/repobelt.yml': `name: RepoBelt

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
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: 20
      - name: Run RepoBelt
        run: |
          npx repobelt check \
            --base "origin/$GITHUB_BASE_REF" \
            --head "$GITHUB_SHA" \
            --format markdown | tee "$GITHUB_STEP_SUMMARY"
`,
  };
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

function renderPolicy(preset: InitPreset): string {
  const presetComment = preset === 'default' ? '' : `# Preset: ${preset}\n`;
  const riskyPaths = [
    'auth/**: require_review',
    'payments/**: require_review',
    'migrations/**: require_review',
    'infra/prod/**: require_review',
    '.github/workflows/**: require_review',
    ...(preset === 'web' || preset === 'node'
      ? [
          'package.json: require_review',
          'pnpm-lock.yaml: require_review',
          'package-lock.json: require_review',
        ]
      : []),
    ...(preset === 'web'
      ? [
          'app/api/**: require_review',
          'pages/api/**: require_review',
          'src/app/api/**: require_review',
          'middleware.*: require_review',
          'next.config.*: require_review',
          'vite.config.*: require_review',
        ]
      : []),
    ...(preset === 'node'
      ? ['tsconfig*.json: require_review', 'src/cli.*: require_review', 'bin/**: require_review', 'scripts/**: require_review']
      : []),
  ];
  const requiredChecks = ['test', 'lint', 'typecheck', ...(preset === 'web' || preset === 'node' ? ['build'] : [])];

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
`;
}
