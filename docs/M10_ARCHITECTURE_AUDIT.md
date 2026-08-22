# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 4
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe architecture that can move the confirmed-contract path from `GOTCHA` to measurable remediation without weakening M8's data/code boundary, losing evaluator-facing replay semantics, allowing the original experiment to be rebound, or allowing a later evaluator to redefine baseline history?

---

## 2. Existing Boundaries Preserved

The deterministic Mutation Pack path may use developer-authored trusted executable protection callbacks.

The confirmed-contract path remains different: M8 model-produced attacks and M10 model-produced protection intent are declarative data only. M10 does not execute AI-generated JavaScript, auto-apply code, or manufacture executable evaluator policy.

The caller supplies the actual improved evaluator. Gotcha verifies observable behavior through the existing M8 attack/evaluator boundary.

---

## 3. Core M10 Architecture

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

Verification accepts only `{ protection, evaluator, improvedEvaluator }`. No replacement contract, case, expected output, attack set, outcome history, source finding, or task identity can be supplied at verification time.

---

## 4. Revision History

Revision 1 allowed verification-time attack/case rebinding. Revision 2 moved those values into the confirmed artifact but still bound them too late. Revision 3 moved binding into an M8-emitted experiment, made original outcomes/order/top-finding historical authority, and locked the net-survivor metric.

The Revision 3 exact-head Codex review found eight remaining architecture gaps. Revision 4 closes all eight as one replay/verification contract.

---

## 5. Closure: Evaluator Realm Provenance

Canonical `expectedOutput` may lose source-realm prototype/identity semantics that M8-supported evaluators legitimately observe.

Revision 4 separates canonical case data from a Gotcha-owned evaluator-facing `case.replay` representation produced by M8. Replay must preserve/reconstruct every evaluator-facing semantic property M8 supports for the original run, including supported cross-realm provenance when relevant.

If those semantics cannot be safely reconstructed, the run is explicitly non-replayable for M10. Drafting rejects it; M10 never silently substitutes canonical clones and claims exact replay.

---

## 6. Closure: Baseline Gates Improved Execution

Verification is now strictly two-phase:

1. run baseline replay only
2. compare positive control, every attack classification, survivor order, and top finding with bound history
3. return immediately on baseline failure
4. execute `improvedEvaluator` only after exact baseline identity passes

This makes historical identity a true execution gate rather than a later comparison.

---

## 7. Closure: Independent Immutable Experiment Ownership

The M8 experiment's structural data must be deeply independently owned from mutable legacy result fields such as `generatedAttacks`, `attack.results`, and `topFinding`.

Replay metadata is owned by the experiment/replay subsystem and must not derive mutable behavior from those legacy public objects.

Required proof: mutating legacy result arrays/records after return cannot mutate experiment structural data or replay behavior.

---

## 8. Closure: Improved Positive-Control Failure

Because M8 rejects the known-good failure before attack results exist, Revision 4 defines `improved-positive-control-failed` as a partial result:

```text
after = null
positiveControlPassed = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
```

Baseline remains complete and identity-matched. Stable M8/M10 error classification distinguishes this from arbitrary improved callback failures. No duplicate positive-control implementation is introduced.

---

## 9. Closure: Deterministic Multi-Failure Semantics

Terminal baseline states are phase-ordered before improved execution:

```text
baseline-execution-failed
baseline-mismatch
```

After a passing baseline, improved known-good failure is terminal:

```text
improved-positive-control-failed
```

For a complete improved replay, all applicable correctness failures are reported in ordered `failureReasons`:

```text
1. regression-detected
2. source-finding-still-survives
```

`state` is the first reason; if no reason exists, it is `verified`.

---

## 10. Closure: Task Identity

Experiment validation now requires:

```text
experiment.task === experiment.contract.task
```

Mismatch rejects before the protection generator runs. Task identity cannot be independently replaced later.

---

## 11. Closure: Replay-Retained Attack Invariants

A valid experiment is already a post-filter/post-dedupe retained set under M8 semantics.

Validation requires every bound attack to differ from expected output under M8 deep equality and forbids same-rule/deep-equal retained duplicates. M10 therefore rejects malformed/reconstructed artifacts before drafting rather than letting M8 silently filter them during replay and create a synthetic baseline mismatch.

---

## 12. Closure: Baseline Evaluator Abort Semantics

A completed historical difference and an evaluator execution failure are different states.

`baseline-mismatch` means replay completed and classifications/order/top finding differ from bound history.

`baseline-execution-failed` means baseline replay could not complete because the evaluator threw, returned non-boolean, or otherwise violated/exited the callback contract.

For execution failure, `verificationPassed` and `baselineIdentityPassed` are false, `after` is null, the improved evaluator is not called, and no mismatch IDs are fabricated for unevaluated attacks. Stable error codes are required; message parsing/stack text are not semantic authority.

---

## 13. Experiment Authority After Revision 4

A replayable experiment is emitted by M8 from one successful invocation and binds:

- validated confirmed contract
- exact task identity
- canonical AI-safe case snapshots
- Gotcha-owned evaluator-facing replay representation
- complete retained post-filter/post-dedupe attack set
- original per-attack outcomes
- deterministic survivor order
- top-finding identity

Structural data is deeply independently owned from mutable legacy result fields, and replay behavior cannot depend on those fields after emission.

This remains structural/canonical binding, not cryptographic historical attestation against a caller fabricating a new self-consistent history.

---

## 14. Verification Authority After Revision 4

The supplied old evaluator is a compatibility witness, not historical authority. It must reproduce bound history exactly before improved execution begins.

A complete improved replay passes only when the known-good output survives, the selected source changes from survived to caught, and no baseline-caught attack becomes survived. Unrelated survivors may remain.

`improvement = baseline survivor count - after survivor count` remains descriptive only and is null when no complete after replay exists.

---

## 15. Files and Scope

This architecture PR remains documentation-only:

```text
docs/M10_CONTRACT_REMEDIATION_SPEC.md
docs/M10_ARCHITECTURE_AUDIT.md
```

Expected implementation files remain `src/contract-remediation.js`, `src/index.js`, `src/contract-attacks.js`, and focused tests. `src/engine.js` and `src/mutation-pack.js` remain unchanged by default; changing either requires an architecture amendment first.

---

## 16. Required Revision 4 Proofs

Implementation must prove:

- experiment structural data and replay behavior are independent from mutable legacy result fields
- supported cross-realm/evaluator-facing semantics replay exactly or the experiment is non-replayable
- task identity equals contract task
- bound attacks satisfy M8 unchanged-output and retained-set dedupe rules before drafting
- baseline mismatch returns before improved evaluator execution
- baseline callback abort returns `baseline-execution-failed` without fabricated mismatch IDs
- improved positive-control failure returns the documented partial shape
- simultaneous regression/source-survival emits ordered failure reasons with deterministic primary state
- net-survivor metric is only produced for complete baseline+after results
- existing M8 public behavior remains unchanged

---

## 17. Acceptance / Stopping Rule

M10 architecture is ready for implementation only after a fresh exact-head review finds no concrete contradiction in experiment ownership/completeness, evaluator-facing replay fidelity, case/task/attack/outcome authority, baseline-first execution ordering, human/AI authority transitions, callback/positive-control semantics, deterministic failure states, source/regression correctness, or metric behavior.

Out of scope remains cryptographic attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic source patching, universal future-attack proof, and a generic sandbox.
