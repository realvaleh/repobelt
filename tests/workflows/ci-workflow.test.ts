import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('project CI workflow', () => {
  it('uses Node 24-ready GitHub Action majors without deprecated v4 JavaScript actions', async () => {
    const workflow = await readFile('.github/workflows/ci.yml', 'utf8');

    expect(workflow).toContain('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true');
    expect(workflow).toContain('actions/checkout@v6');
    expect(workflow).toContain('actions/setup-node@v6');
    expect(workflow).toContain('pnpm/action-setup@v6');
    expect(workflow).not.toContain('actions/checkout@v4');
    expect(workflow).not.toContain('actions/setup-node@v4');
    expect(workflow).not.toContain('pnpm/action-setup@v4');
  });
});
