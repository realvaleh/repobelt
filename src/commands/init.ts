import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface InitWriteResult {
  created: string[];
}

export function generateInitFiles(): Record<string, string> {
  return {
    '.repobelt.yml': `version: 1

# Files that should fail CI when changed by an AI-generated PR unless policy is edited.
protected_paths:
  - .env
  - .env.*
  - secrets/**
  - '**/*.pem'
  - '**/*.key'

# Files that are allowed but should receive explicit human review.
risky_paths:
  auth/**: require_review
  payments/**: require_review
  migrations/**: require_review
  infra/prod/**: require_review
  .github/workflows/**: require_review

required_checks:
  - test
  - lint
  - typecheck

allowlist:
  paths: []
`,
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
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v4
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

export async function writeInitFiles(targetDirectory: string): Promise<InitWriteResult> {
  const files = generateInitFiles();
  const created: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(targetDirectory, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, { encoding: 'utf8', flag: 'wx' });
    created.push(relativePath);
  }

  return { created };
}
