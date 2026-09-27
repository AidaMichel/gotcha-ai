# Security Policy

Gotcha processes evaluator logic, generated model output, and resumable local session artifacts. Treat all external and persisted data as untrusted unless the relevant API explicitly establishes otherwise.

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could enable code execution, authority bypass, unsafe provider handling, or trust-boundary bypass.

Use GitHub's private vulnerability reporting feature for this repository when available. If private reporting is not available, contact the repository owner privately through their GitHub profile before publishing technical details.

## Scope

Security-sensitive areas include:

- provider transport boundaries
- evaluator and mutation execution boundaries
- replay/session integrity
- prototype, Proxy, Promise, and runtime-brand handling
- package/public API authority capture
- any path that could silently bypass required human confirmation

## Supported release line

Security fixes target the current V0 release line and the latest `main` branch during active development.
