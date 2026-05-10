# RepoBelt Market Positioning

**Date:** 2026-05-10

## Working name

**RepoBelt**

## Tagline

**A seatbelt for AI-generated pull requests.**

## Availability check

Checked on 2026-05-10:

- GitHub repository name search: `repobelt in:name` returned no exact repo results.
- npm package: `repobelt` returned npm `E404` / not found.
- PyPI package: `repobelt` returned no visible package from `pip index versions`.

This is not a legal/trademark clearance, but it is promising for an open-source devtool name.

## Existing adjacent tools

The broad space is not empty. Existing adjacent categories include:

- Repository-to-LLM context packers: Repomix, code2prompt, Gitingest.
- AGENTS.md / context generators: agentseed, agentmd, contextor, Archie, agent-ready.
- Agent-readiness scanners: kodustech/agent-readiness, agent-next/agent-ready, jpequegn/agent-readiness-score.
- Guardrail/safety tools: shellfirm, leash, agent-guardrails, repo-seatbelt, agentlint variants.

## Differentiated wedge

RepoBelt should not position itself as another generic repository summarizer or AGENTS.md generator.

RepoBelt should position itself as:

> **A GitHub Action and CLI that protects repositories from unsafe AI-generated pull requests.**

The initial wedge is CI enforcement, not documentation generation.

## Core promise

When an AI agent opens or modifies a PR, RepoBelt checks the diff and reports whether the change stays within the repo's safety policy.

Examples:

- Blocks protected paths unless explicitly approved.
- Flags secrets and suspicious credentials.
- Requires tests/lint/typecheck for risky changes.
- Detects high-risk domains such as auth, payments, migrations, infrastructure, deployment, and CI config.
- Generates a clear PR comment/report explaining what is safe, risky, or blocked.

## Product metaphor

Seatbelt, not autopilot.

RepoBelt does not replace Claude, Codex, Cursor, Copilot, or human maintainers. It makes agent-generated work safer to review and merge.

## Primary users

- Open-source maintainers receiving AI-generated PRs.
- Small teams using Claude Code/Codex/Cursor/Windsurf.
- Engineering managers who want to allow agents without giving them unlimited trust.
- Developers who want reusable policy files for their repos.

## MVP scope

1. CLI: `repobelt init`
2. Policy file: `.repobelt.yml`
3. Diff scanner: `repobelt check --base main --head HEAD`
4. Markdown report output: `repobelt report --format markdown`
5. GitHub Action example workflow.
6. Default policy templates for common stacks.
7. Secret/risky path/protected path detection.

## Non-goals for MVP

- Full AI code review.
- Replacing static analyzers like Semgrep.
- Running arbitrary agents.
- Guaranteeing security correctness.
- Complex SaaS dashboard.
- Language-specific AST analysis beyond basic stack detection.

## Possible later features

- PR comment bot.
- SARIF output.
- GitHub App.
- Agent-specific presets for Claude Code, Codex, Cursor, Copilot, OpenCode.
- MCP server.
- Human approval labels for risky files.
- Policy learning from repo history.
- Integration with CODEOWNERS.
