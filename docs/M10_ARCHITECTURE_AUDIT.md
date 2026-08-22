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

The flow is:

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

Verification accepts only:

```js
{
  protection,
  evaluator,
  improvedEvaluator
}
```

No replacement contract, case, expected output, attack set, outcome history, source finding, or task identity can be supplied at verification time.

---

## 4. Revision History

### Revision 1

Codex found that verification could accept a substituted/partial attack set and a different evaluation case.

Revision 2 moved attack/case data into the confirmed artifact.

### Revision 2

Codex found that the binding still happened too late: drafting accepted a caller-labelled bare attack array, case/attacks were independently assembled, baseline outcomes were not historical authority, and `improvement` lacked a normative formula.

Revision 3 introduced an M8-emitted self-contained experiment, bound original outcomes/order/top finding, exact baseline identity, and locked the net-survivor metric.

### Revision 3 current-head review

Codex identified eight remaining architecture gaps. Revision 4 closes all eight as one coherent replay/verification contract rather than as isolated patches.

---

## 5. Revision 4 Closure: Evaluator Realm Provenance

### Finding

Canonicalizing `expectedOutput` can erase source-realm prototype/identity semantics that M8-supported evaluators may legitimately observe. Replaying only canonical data can therefore make the unchanged evaluator behave differently.

### Decision

The experiment now distinguishes canonical AI-safe case data from a Gotcha-owned evaluator-facing replay representation.

`case.input` and `case.expectedOutput` remain canonical snapshots for serialization and generator use.

`case.replay` is created by M8 and preserves or reconstructs the evaluator-facing semantics required to reproduce the original M8 invocation, including supported cross-realm provenance where relevant. It is not caller-authored alternate case data and is not sent to the protection model by default.

If M8 cannot safely preserve/reconstruct those semantics for a successful run, the experiment is explicitly non-replayable for M10. M10 drafting rejects it rather than silently substituting canonical-only values and claiming exact replay.

This closes the P1 provenance gap without expanding M10 into a generic serializer or sandbox.

---

## 6. Revision 4 Closure: Baseline Must Gate Improved Execution

### Finding

Revision 3 described both M8 calls before requiring a return on baseline mismatch. An invalid improved evaluator could therefore throw before M10 returned the historically correct baseline state.

### Decision

Verification is now normatively two-phase:

1. run baseline replay only
2. compare positive control, every attack classification, survivor order, and top finding against the bound experiment
3. immediately return on baseline failure
4. invoke `improvedEvaluator` only after exact baseline identity passes

The improved evaluator is never executed before historical identity is established.

---

## 7. Revision 4 Closure: Independent Immutable Experiment Ownership

### Finding

A naive implementation could let experiment attack data alias mutable legacy result objects such as `result.generatedAttacks`. Later mutation of a legacy field could silently mutate the bound experiment.

### Decision

M8 experiment emission must create deeply independently owned structural data. Nested arrays/records cannot alias mutable legacy result fields.

Replay metadata required for evaluator semantics is owned exclusively by the experiment/replay subsystem and likewise cannot derive mutable behavior from legacy public result objects.

Required test: mutate `generatedAttacks`, attack records, result arrays, and related legacy fields after M8 returns; the experiment's structural data and replay behavior must remain unchanged.

---

## 8. Revision 4 Closure: Improved Positive-Control Failure

### Finding

M8 fails before producing attack results when an evaluator rejects the known-good expected output. Revision 3 nevertheless required complete `after.attack` and metric fields for `improved-positive-control-failed`.

### Decision

The state is explicitly partial:

```text
after = null
positiveControlPassed = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
state = improved-positive-control-failed
```

Baseline remains complete and identity-matched.

M10 recognizes the specific M8 positive-control failure through stable error classification. Arbitrary improved callback failures are not mislabeled as positive-control failures.

No parallel positive-control implementation is introduced.

---

## 9. Revision 4 Closure: Deterministic Multi-Failure Semantics

### Finding

A complete improved replay can simultaneously leave the source surviving and create a regression, while Revision 3 exposed only one scalar `state` with no precedence rule.

### Decision

Terminal baseline states are phase-ordered and returned before improved execution:

```text
baseline-execution-failed
baseline-mismatch
```

After a passing baseline, improved positive-control failure is terminal:

```text
improved-positive-control-failed
```

For a complete improved replay, M10 computes every applicable correctness failure and exposes ordered `failureReasons` with normative precedence:

```text
1. regression-detected
2. source-finding-still-survives
```

`state` is the first reason. If no reason exists, state is `verified`.

For simultaneous regression + source survival:

```js
failureReasons = [
  "regression-detected",
  "source-finding-still-survives"
];
state = "regression-detected";
```

Detailed booleans and ID sets remain authoritative for diagnosis.

---

## 10. Revision 4 Closure: Task Identity

### Finding

The artifact contains both `experiment.task` and `experiment.contract.task`, but Revision 3 did not require equality.

### Decision

Experiment validation requires:

```text
experiment.task === experiment.contract.task
```

Mismatch rejects atomically before the protection generator runs. Task identity cannot be separately replaced at verification.

---

## 11. Revision 4 Closure: Replay-Retained Attack Invariants

### Finding

An artifact could contain an attack M8 would remove during replay because it deep-equals the expected output or duplicates a same-rule retained output. Drafting would accept it, but baseline replay would later filter it and fail identity.

### Decision

Experiment validation now requires the same retained-set invariants M8 applies before attack evaluation:

- every bound attack differs from expected output under M8 deep-equality semantics
- no same-rule/deep-equal retained duplicates exist

A valid bound experiment is already a post-filter/post-dedupe replay set. M10 rejects malformed/reconstructed artifacts before generator execution rather than relying on a later baseline mismatch.

---

## 12. Revision 4 Closure: Baseline Evaluator Abort Semantics

### Finding

A stale baseline evaluator can throw or return non-boolean before M8 produces complete results. Revision 3 required `baseline-mismatch` plus mismatch IDs even when no complete comparison was possible.

### Decision

Completed historical difference and evaluator execution failure are separate states.

`baseline-mismatch` means the baseline replay completed and its observable classifications/order/top finding differ from bound history.

`baseline-execution-failed` means M8 could not complete baseline replay because the evaluator violated/exited the callback contract.

For execution failure:

```text
verificationPassed = false
baselineIdentityPassed = false
after = null
improvedEvaluator is not called
```

No attack IDs are fabricated for unevaluated attacks. Stable M8/M10 error classification is required; message-text parsing and arbitrary callback stack data are not semantic authority.

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

Its structural data is deeply independently owned from mutable legacy result fields, and replay behavior cannot depend on those mutable fields after emission.

M10 validates the artifact as one unit before drafting.

This remains structural/canonical binding, not cryptographic historical attestation against a caller fabricating an entirely new self-consistent artifact.

---

## 14. Verification Authority After Revision 4

The caller-supplied old evaluator is not historical authority. It is a compatibility witness and must reproduce bound history exactly.

The improved evaluator is not run until that witness passes.

For complete improved replay, success requires:

- improved positive control passes
- source finding changes from survived to caught
- no baseline-caught attack becomes survived

Not every unrelated survivor must disappear.

`improvement` remains:

```text
baseline survivor count - after survivor count
```

It is descriptive only and is `null` when no complete after replay exists.

---

## 15. Files and Scope

This architecture PR remains documentation-only:

```text
docs/M10_CONTRACT_REMEDIATION_SPEC.md
docs/M10_ARCHITECTURE_AUDIT.md
```

Implementation is expected later in:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to change either requires an explicit architecture amendment first.

---

## 16. Required Revision 4 Proofs

Implementation must prove:

- experiment structural data and replay behavior are independent from mutable legacy result fields
- cross-realm/evaluator-facing replay semantics are preserved or the experiment is explicitly non-replayable
- task identity matches contract task
- bound attacks already satisfy M8 unchanged-output and retained-set dedupe rules
- baseline mismatch returns before improved evaluator execution
- baseline callback abort uses `baseline-execution-failed` without fabricated mismatch IDs
- improved positive-control failure returns the documented partial shape
- simultaneous regression/source-survival emits deterministic ordered failure reasons
- net-survivor metric is only produced for complete baseline+after results
- existing M8 public behavior remains unchanged

---

## 17. Acceptance / Stopping Rule

M10 architecture is ready for implementation only after a fresh exact-head review finds no concrete contradiction in:

- experiment completeness/independent ownership
- evaluator-facing replay fidelity
- case/task/attack/outcome authority
- baseline-first execution ordering
- human/AI authority transitions
- positive-control and callback-failure semantics
- deterministic failure-state semantics
- regression/source-closure correctness
- locked metric behavior

Out of scope remains cryptographic attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic source patching, universal future-attack proof, and a generic sandbox.
