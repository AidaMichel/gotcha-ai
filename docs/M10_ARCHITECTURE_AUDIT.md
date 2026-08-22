# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 4
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe architecture that can move the confirmed-contract path from `GOTCHA` to measurable remediation without weakening M8's data/code boundary, losing evaluator-facing replay semantics, allowing the original experiment to be rebound, or allowing a later evaluator to redefine baseline history?

---

## 2. Existing Boundaries Preserved

M8 model-produced attacks and M10 model-produced protection intent remain declarative data only. M10 does not execute AI-generated JavaScript, auto-apply code, or manufacture executable evaluator policy.

The caller supplies the improved evaluator. Gotcha verifies observable behavior through the existing M8 attack/evaluator boundary.

---

## 3. Core Flow

```text
M8 successful contract-attack run
  ↓
M8 emits one self-contained replayable experiment
  ↓
AI drafts declarative protection intent
  ↓
Human accept / edit / reject
  ↓
Caller implements trusted improved evaluator
  ↓
M10 replays baseline only
  ↓
Exact historical identity gate
  ↓
Only if gate passes, replay improved evaluator
  ↓
Positive control + source closure + regression verification
```

Verification accepts only `{ protection, evaluator, improvedEvaluator }`. No replacement experiment inputs can be supplied at verification time.

---

## 4. Revision History

Revision 1 allowed verification-time attack/case rebinding. Revision 2 bound those values too late. Revision 3 moved binding into an M8-emitted experiment, made original outcomes/order/top-finding historical authority, and locked the net-survivor metric.

The Revision 3 exact-head Codex review found eight remaining gaps. Revision 4 closes all eight.

---

## 5. Evaluator Realm Provenance — Closed

Canonical values can lose cross-realm prototype/identity semantics that M8-supported evaluators observe.

Revision 4 adds a Gotcha-owned evaluator-facing `case.replay` representation produced by M8. Replay must preserve/reconstruct supported evaluator-observable semantics from the original run. If that cannot be done safely, the experiment is explicitly non-replayable and M10 drafting rejects it. Canonical-only fallback may never be called exact replay.

---

## 6. Baseline Gates Improved Execution — Closed

Verification is strictly two-phase: baseline replay completes and is compared with bound history first; any baseline failure returns immediately; `improvedEvaluator` is called only after exact baseline identity passes.

---

## 7. Independent Immutable Experiment — Closed

Experiment structural data must be deeply independently owned from mutable legacy result fields such as `generatedAttacks`, `attack.results`, and `topFinding`.

Replay metadata is owned by the experiment/replay subsystem and cannot derive mutable behavior from those legacy fields. Required tests mutate legacy result records after return and prove experiment structure/replay behavior is unchanged.

---

## 8. Improved Positive-Control Failure — Closed

M8 may reject the known-good output before attack results exist. Revision 4 therefore defines a partial result:

```text
after = null
positiveControlPassed = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
state = improved-positive-control-failed
```

Stable error classification distinguishes this from arbitrary improved callback failures. No duplicate positive-control implementation is introduced.

---

## 9. Deterministic Multi-Failure Semantics — Closed

Baseline terminal states are phase-ordered before improved execution: `baseline-execution-failed`, then `baseline-mismatch` as applicable by execution path.

For a complete improved replay, all applicable correctness failures are reported in ordered `failureReasons`:

```text
1. regression-detected
2. source-finding-still-survives
```

`state` is the first reason; with no reasons, `state = verified`.

---

## 10. Task Identity — Closed

Validation requires `experiment.task === experiment.contract.task`. Mismatch rejects before generator execution and task cannot be separately replaced later.

---

## 11. Replay-Retained Attack Invariants — Closed

A valid experiment is already a post-filter/post-dedupe retained set under M8 semantics. Every bound attack must differ from expected output under M8 deep equality, and same-rule/deep-equal retained duplicates are forbidden.

Malformed/reconstructed artifacts therefore fail before drafting rather than being silently filtered during replay.

---

## 12. Baseline Evaluator Abort Semantics — Closed

`baseline-mismatch` means a completed replay disagrees with bound classifications/order/top finding.

`baseline-execution-failed` means replay could not complete because the evaluator threw, returned non-boolean, or otherwise violated/exited the callback contract.

Execution failure returns no fabricated mismatch IDs, never executes the improved evaluator, and uses stable error codes rather than message/stack parsing.

---

## 13. Revision 4 Experiment Authority

A replayable M8 experiment binds:

- validated confirmed contract and exact task
- canonical AI-safe case snapshots
- Gotcha-owned evaluator-facing replay representation
- complete retained post-filter/post-dedupe attack set
- original per-attack outcomes
- deterministic survivor order and top-finding identity

Structural data is independently owned from mutable legacy result fields, and replay behavior cannot depend on those fields after emission.

This remains structural/canonical binding, not cryptographic historical attestation.

---

## 14. Revision 4 Verification Authority

The old evaluator is a compatibility witness, not historical authority. It must reproduce bound history before improved execution.

A complete improved replay passes only if the known-good output is preserved, the selected source changes from survived to caught, and no baseline-caught attack becomes survived.

`improvement = baseline survivor count - after survivor count` remains descriptive only and is `null` without a complete after replay.

---

## 15. Scope

This PR remains documentation-only:

```text
docs/M10_CONTRACT_REMEDIATION_SPEC.md
docs/M10_ARCHITECTURE_AUDIT.md
```

Expected implementation touches `src/contract-remediation.js`, `src/index.js`, `src/contract-attacks.js`, and focused tests. `src/engine.js` and `src/mutation-pack.js` remain unchanged by default; changing either requires an architecture amendment.

---

## 16. Required Revision 4 Proofs

Implementation must prove experiment independence, cross-realm replay fidelity or explicit non-replayability, task equality, retained-set validity, baseline-first execution, deterministic baseline abort semantics, partial improved-positive-control output, ordered simultaneous-failure reporting, metric nullability for partial runs, and unchanged existing M8 public behavior.

---

## 17. Acceptance / Stopping Rule

M10 architecture is ready for implementation only after a fresh exact-head review finds no concrete contradiction in experiment ownership/completeness, evaluator-facing replay fidelity, case/task/attack/outcome authority, baseline-first ordering, human/AI authority transitions, callback/positive-control semantics, deterministic failure states, source/regression correctness, or metric behavior.

Out of scope remains cryptographic attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic source patching, universal future-attack proof, and a generic sandbox.
