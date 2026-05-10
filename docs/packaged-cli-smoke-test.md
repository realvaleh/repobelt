# Packaged CLI smoke test

Before publishing RepoBelt to npm, run the packaged CLI smoke test from the repository root:

```bash
pnpm smoke:pack
```

The smoke test validates the actual npm tarball, not just the local TypeScript sources.

## What it does

The script:

1. Runs `npm pack` into a temporary directory.
2. Creates a clean temporary npm project.
3. Installs the generated `repobelt-*.tgz` tarball.
4. Runs `npx repobelt --help`.
5. Runs `npx repobelt init --dry-run`.
6. Initializes a tiny git repository.
7. Runs `npx repobelt init`.
8. Commits a baseline fixture.
9. Adds a changed `auth/login.ts` file.
10. Runs `npx repobelt check --base HEAD --head worktree`.
11. Verifies the packaged CLI reports a warning and lists `auth/login.ts` as a risky file.

## Keeping the temp directory

By default, the script deletes its temporary directory. To inspect the generated project:

```bash
REPOBELT_KEEP_SMOKE_TMP=1 pnpm smoke:pack
```

The script will print the temp directory path before exiting.

## Why this exists

Unit tests prove the source behavior. The smoke test proves the package users will actually install has:

- a working `bin` entry
- built `dist` files
- included docs/examples metadata
- working CLI command resolution through `npx`
- working behavior in a clean project

Run this before npm publish and before public launch announcements.
