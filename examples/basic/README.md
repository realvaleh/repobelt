# RepoBelt Basic Example

This example shows how RepoBelt classifies common pull request changes.

## Files

- `src/app.ts` — normal application code; allowed.
- `auth/login.ts` — authentication code; risky and requires review.
- `.repobelt.yml` — policy for this example.

## Try it manually

From a temporary git repository, copy this example policy and create changed files:

```bash
cp examples/basic/.repobelt.yml .repobelt.yml
mkdir -p src auth
printf 'export const app = true;\n' > src/app.ts
printf 'export const login = true;\n' > auth/login.ts
npx repobelt check --base HEAD --head worktree --format markdown
```

Expected result: `WARN` because `auth/login.ts` matches `auth/**`.

Create a protected file:

```bash
printf 'SECRET=value\n' > .env
npx repobelt check --base HEAD --head worktree --format markdown
```

Expected result: `FAIL` because `.env` is protected.
