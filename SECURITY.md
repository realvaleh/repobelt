# Security Policy

RepoBelt is a safety tool, so security reports should be handled carefully.

## Reporting a vulnerability

Please do **not** open a public issue for security-sensitive reports.

Use GitHub private vulnerability reporting if it is enabled for this repository:

<https://github.com/realvaleh/repobelt/security/advisories/new>

If private vulnerability reporting is not available, contact the maintainer privately before sharing details publicly.

## Do not include secrets

Do not send or post:

- API keys
- access tokens
- passwords
- private keys
- connection strings
- proprietary repository contents
- logs that may contain credentials

Use `[REDACTED]` for sensitive values.

## What to include

For a useful report, include:

- affected RepoBelt version
- operating system and Node.js version
- whether the issue occurs locally, in GitHub Actions, or both
- minimal reproduction steps using synthetic data
- expected behavior and actual behavior

## Scope

Security-sensitive examples include:

- RepoBelt printing secret values that should be redacted
- bypasses in secret detection that could mislead users
- unsafe behavior in generated workflows
- dependency or package publishing concerns

General bugs and feature requests can use the public issue templates, as long as no sensitive material is included.
