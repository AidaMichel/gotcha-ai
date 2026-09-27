# Changelog

All notable changes to Gotcha are documented here.

## 0.1.0 — V0 release candidate

### Added

- Deterministic Gotcha demo and public `runGotcha()` API.
- Mutation Packs and survivor ranking.
- Quality Contract drafting from teaching evidence.
- Explicit human confirmation for proposed quality rules.
- Provider-independent contract attack generation.
- Caller-selected declarative protection proposals.
- Human-confirmed remediation and deterministic re-attack verification.
- Guided CLI flow: `init`, `run`, and `verify`.
- Local resumable session artifacts for the guided flow.
- CI across Node 20, 22, 24, and 26.
- Packed-artifact install, CLI demo, and public-API smoke checks.
- First-run and guided CLI UX focused on a clear blind-spot “Gotcha” moment.
- Human confirmation of generated survivor candidates before remediation.
- Trusted-severity ranking for contract survivors; generator self-scores are descriptive only.
- Async/score evaluator probing with repeated trials, confidence intervals, multi-case support, and baseline-stability gating.
- Language-neutral command evaluator adapter.
- `gotcha-ai probe` CLI for stable survivors, flaky candidates, caught candidates, and unstable baselines.

### Release status

The release candidate is not considered fully shipped until the remaining external gates in
`docs/RC1_RELEASE_READINESS.md` are complete, including real-provider proof and post-publication npm smoke testing.
