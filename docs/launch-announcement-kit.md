# Launch announcement kit

Use this when RepoBelt is ready to go public. Keep the tone direct: this is a small, useful safety tool for maintainers using AI coding agents, not a grand manifesto.

## One-line description

RepoBelt is a CI safety check for AI-generated pull requests. It flags protected files, risky paths, and secret-shaped strings before a maintainer merges the PR.

## Short GitHub description

```text
A seatbelt for AI-generated pull requests.
```

## Longer GitHub/social description

```text
RepoBelt is a local-first CLI and GitHub Action that checks pull request diffs for unsafe AI-agent changes. It catches protected files, risky areas like auth/payments/migrations, and secret-shaped strings, then writes a clean report for reviewers.
```

## Product Hunt style tagline

```text
A CI seatbelt for AI-generated pull requests.
```

## Demo copy

```text
AI agents can modify a lot of code fast. RepoBelt adds a deterministic safety layer in CI: protected files fail, risky paths get called out, and secret-shaped strings are reported without printing the secret value.
```

## X/Twitter launch post

```text
I built RepoBelt: a seatbelt for AI-generated pull requests.

AI coding agents are getting good enough to touch real repos, but maintainers still need hard safety checks in CI.

RepoBelt flags:
- protected files like .env and secrets/**
- risky paths like auth/**, payments/**, migrations/**
- token/private-key shaped strings

It runs locally or in GitHub Actions and writes a reviewer-friendly report.

RepoBelt is not another repo summarizer. It does not try to tell an agent what to do. It helps maintainers decide whether an agent PR crossed a line.

GitHub: https://github.com/realvaleh/repobelt
```

## X/Twitter thread version

### Post 1

```text
I built RepoBelt: a seatbelt for AI-generated pull requests.

The problem is simple: AI agents can change code fast, but maintainers still need deterministic guardrails before merge.
```

### Post 2

```text
RepoBelt checks a PR diff for things I would want called out immediately:

- .env, secrets/**, *.pem, *.key
- auth/**, payments/**, migrations/**, infra/prod/**
- token/private-key shaped strings
```

### Post 3

```text
The output is intentionally boring.

PASS, WARN, or FAIL.

Blocked files fail CI. Risky files tell reviewers where to look. Secret findings report the location and pattern without printing the secret value.
```

### Post 4

```text
This is not another repo summarizer or AGENTS.md generator.

Those tools help agents understand a repo. RepoBelt helps maintainers decide whether an agent-generated change is safe to review or merge.
```

### Post 5

```text
Install/run:

npx repobelt init
npx repobelt check --base HEAD --head worktree

GitHub: https://github.com/realvaleh/repobelt
```

## Hacker News draft

### Title

```text
Show HN: RepoBelt, a CI seatbelt for AI-generated pull requests
```

### Body

```text
Hi HN, I built RepoBelt, a small CLI/GitHub Action for maintainers who are starting to receive or create AI-generated pull requests.

The idea is not to review code with an LLM. It is much simpler: check the diff for deterministic safety boundaries before a human spends time reviewing it.

RepoBelt currently flags:

- protected files such as .env, secrets/**, *.pem, and *.key
- risky paths such as auth/**, payments/**, migrations/**, infra/prod/**, and GitHub workflow files
- secret-shaped strings such as private key blocks, GitHub token patterns, OpenAI/Anthropic token patterns, AWS access key IDs, and high-entropy .env assignments

It outputs text, Markdown, or JSON. The generated GitHub Action writes a Markdown report to the step summary.

I built it because a lot of AI coding tools focus on giving agents more context. That matters, but I wanted the opposite side of the workflow: a boring, deterministic check that helps maintainers decide whether an agent PR crossed a boundary.

GitHub: https://github.com/realvaleh/repobelt
```

## Reddit r/opensource draft

```text
Title: I built RepoBelt, a CI safety check for AI-generated pull requests

I built a small open-source CLI/GitHub Action called RepoBelt.

It checks PR diffs for unsafe AI-agent changes before maintainers merge them:

- protected files like .env, secrets/**, *.pem, *.key
- risky paths like auth/**, payments/**, migrations/**, infra/prod/**
- secret-shaped strings like private keys, GitHub tokens, OpenAI/Anthropic token patterns, AWS access key IDs, and high-entropy .env assignments

It can run locally or in GitHub Actions. The GitHub Action writes a Markdown report to the step summary.

The goal is not to replace code review. It is just a deterministic safety layer for repos where AI agents are starting to contribute changes.

GitHub: https://github.com/realvaleh/repobelt
```

## Reddit r/programming draft

```text
Title: RepoBelt: a CI seatbelt for AI-generated pull requests

AI coding agents can touch a lot of code quickly. RepoBelt is a small CLI/GitHub Action that checks pull request diffs for deterministic safety boundaries before a maintainer merges the PR.

It flags protected files, risky paths, and secret-shaped strings, then emits text, Markdown, or JSON output. The generated GitHub Action writes a reviewer-friendly Markdown report to the step summary.

This is intentionally not an LLM reviewer. It is closer to a policy gate for things that should be called out every time.

GitHub: https://github.com/realvaleh/repobelt
```

## LinkedIn draft

```text
I built RepoBelt, a small open-source safety tool for AI-generated pull requests.

As AI coding agents become more common, maintainers need more than better prompts and repo context. They need deterministic guardrails in CI.

RepoBelt checks a PR diff for:

- protected files like .env and secrets/**
- risky areas like auth, payments, migrations, infrastructure, and CI workflows
- secret-shaped strings such as private keys and token patterns

It runs as a local CLI or GitHub Action and produces text, Markdown, or JSON reports.

The goal is simple: help maintainers see when an AI-generated PR crossed a boundary before they merge it.

GitHub: https://github.com/realvaleh/repobelt
```

## Short replies for comments

### "How is this different from a repo summarizer?"

```text
Repo summarizers help agents understand a codebase. RepoBelt checks whether a change crossed safety boundaries. It is closer to a CI policy gate than an LLM context tool.
```

### "Why not just use CODEOWNERS?"

```text
CODEOWNERS is useful for routing review. RepoBelt is meant to classify the diff and fail/warn in CI, including protected files and secret-shaped strings. They can work together.
```

### "Does it send code to an AI model?"

```text
No. The first version is local and deterministic. It checks paths and secret-shaped patterns without sending code to a model.
```

### "Can this block real secrets?"

```text
It can catch common secret-shaped strings and high-entropy .env assignments, but it should be treated as one safety layer, not a complete secret-scanning platform.
```

## Launch order

1. Make the repo public after explicit approval.
2. Enable private vulnerability reporting.
3. Publish the GitHub release draft.
4. Publish npm only after explicit approval.
5. Verify `npx repobelt --help` from npm.
6. Post X/Twitter short launch post.
7. Post to Reddit after install path is confirmed.
8. Post Hacker News if the repo and npm package are both public and stable.
