# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 5
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe M10 architecture that can move the confirmed-contract path from `GOTCHA` to measurable remediation without weakening M8, losing evaluator-facing replay semantics, allowing experiment rebinding, allowing baseline history to be redefined, or leaving public artifact/result behavior implementation-dependent?

---

## 2. Existing Boundaries Preserved

M8 model-produced attacks and M10 model-produced protection intent remain declarative data only.

M10 does not execute AI-generated evaluator code, auto-apply patches, or turn model output into executable policy.

A human authorizes remediation intent. The caller supplies the actual improved evaluator. Gotcha verifies observable behavior through the established M8 attack/evaluator boundary.

---

## 3. Core Flow

```text
M8 successful contract-attack run
  ↓
M8 emits one independently owned replayable experiment
  ↓
M10 validates the full M8 replay schema
  ↓
AI drafts one declarative protection intent
  ↓
M10 validates exact generator-output schema
  ↓
Human accept / edit statement / reject
  ↓
Caller implements trusted improved evaluator
  ↓
M10 fully revalidates confirmed artifact
  ↓
Baseline replay only
  ↓
Exact historical identity gate
  ↓
Only then improved replay
  ↓
Deterministic partial/complete verification result
```

Verification accepts only `{ protection, evaluator, improvedEvaluator }`.

---

## 4. Revision History

Revision 1 allowed verification-time attack/case rebinding.

Revision 2 bound case/attack data too late.

Revision 3 moved experiment authority to M8, bound original outcomes/order/top-finding history, and locked the net-survivor metric.

Revision 4 closed eight exact-head findings around realm replay provenance, immutable experiment ownership, baseline-before-improved ordering, positive-control partial output, failure precedence, task equality, replay retained-set invariants, and baseline abort semantics.

Revision 5 closes the four exact Revision 4 findings and proactively removes adjacent implementation-choice seams that could produce another review loop.

---

## 5. Revision 5 Closure: Full M8 Replay Schema

### Finding

Revision 4 validated attack identity/rules/scores/dedupe but did not require every constraint needed when bound attacks are projected back into an M8 generator result. In particular, an artifact could exceed M8's attack-count limit or omit non-empty `type`, `description`, or `rationale`, pass drafting, and then fail only during replay.

### Decision

Experiment validation is now defined as **replay-complete**: before the protection generator runs, the deterministic projection of the bound experiment into M8 generator candidates must satisfy the full current M8 generator schema.

The spec explicitly includes:

- maximum 20 attacks for the bound M8 version
- unique non-empty IDs
- active non-empty rule IDs
- required non-empty `type`, `description`, and `rationale`
- own mutated-output value through the bound output mapping
- exact required score dimensions and finite `[0,1]` values
- AI-safe-data restrictions
- contract-derived rule/severity authority
- unchanged-output filtering invariant
- same-rule/deep-equal retained-set dedupe invariant

The spec also adds a future-proof rule: if M8 gains another required replay constraint before implementation, M10 must mirror it or use a side-effect-free shared validator. A knowingly weaker M10 validator is forbidden.

---

## 6. Revision 5 Closure: Normative Protection Schemas

### Finding

Revision 4 named task/source/rule checks but did not define exact versioned schemas for untrusted protection-generator output or every artifact/decision crossing later public boundaries.

### Decision

Revision 5 locks exact v1 schemas and exact-own-key validation for:

```text
protection generator output
protection draft
accept decision
edit decision
reject decision
confirmed protection
rejected protection
```

Generator output may contain only declarative version/task/source/rule identity plus `protection.statement` and `protection.rationale`.

Unknown fields are rejected. Functions, accessors, Proxies, unsupported exotic values, executable/code-bearing objects, alternate contract/rule/case/experiment payloads, and model-generated callbacks/patches are rejected through the AI-safe-data boundary and exact schema.

Serialized/reloaded drafts and confirmed artifacts are revalidated from data. Prior object identity is never authority.

---

## 7. Revision 5 Closure: Exact Baseline-Execution-Failed Output

### Finding

Revision 4 defined the baseline abort state but not the exact values of every public output field. Consumers could disagree about omitted fields versus `false`, `null`, or empty arrays.

### Decision

`baseline-execution-failed` now has one exact complete top-level result shape.

Key locked values:

```text
baseline = null
after = null
baselineIdentityPassed = false
baselineMismatchAttackIds = []
baselineExecutionError.code = BASELINE_EVALUATOR_EXECUTION_FAILED
sourceFindingReproduced = false
sourceFindingCaught = false
positiveControlPassed = null
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = [baseline-execution-failed]
state = baseline-execution-failed
```

`positiveControlPassed` is deliberately `null`: an incomplete replay does not expose execution-progress timing as semantic truth.

The improved evaluator is never called and no mismatch IDs are fabricated.

---

## 8. Revision 5 Closure: Deterministic ID-Array Ordering

### Finding

Membership of mismatch/eliminated/regression arrays was defined but ordering was not.

### Decision

All public verification attack-ID diagnostic arrays use **bound `experiment.attacks` order filtered by set membership**.

This applies to:

```text
baselineMismatchAttackIds
eliminatedAttackIds
regressionAttackIds
```

and to any future V1 diagnostic attack-ID array unless another order is explicitly documented.

The sole intentional exception is `survivorOrderIds`, whose meaning is M8 deterministic survivor rank order.

Lexical sorting, callback result order, Set/Map iteration order, or other implementation-dependent ordering is forbidden.

---

## 9. Proactive Loop-Prevention Closure: Evaluator Failure Symmetry

Revision 4 still allowed an arbitrary improved evaluator execution abort to reject/throw while positive-control failure returned a semantic state. That left a potential reject-vs-return implementation choice.

Revision 5 removes it.

After baseline identity passes:

- improved known-good rejection → exact `improved-positive-control-failed`
- any other improved callback execution abort → exact `improved-execution-failed`

Both use the same complete top-level field set and deterministic `null`/`false`/`[]` conventions.

This is deliberately specified now to avoid a follow-up ambiguity after implementation begins.

---

## 10. Proactive Loop-Prevention Closure: One Output Field Set

Every semantic verification state now emits the same top-level v1 fields.

Partial states do not omit fields. They assign exact values specified by the state contract.

Malformed/untrusted artifact validation failures remain public-boundary rejections and are not mixed with semantic replay states.

This cleanly separates:

```text
invalid input/artifact → reject
valid artifact + runtime verification outcome → deterministic result object
```

---

## 11. Experiment Authority After Revision 5

A replayable experiment binds:

- confirmed contract and exact task
- canonical AI-safe case snapshots
- Gotcha-owned evaluator-facing replay representation
- complete retained attack set that already satisfies full replay-generator validation
- original per-attack outcomes
- deterministic survivor order
- top-finding identity

The experiment is deeply independently owned from legacy result objects.

Cross-realm/evaluator-facing semantics are preserved or the experiment is explicitly non-replayable.

This remains structural/canonical binding, not cryptographic attestation.

---

## 12. Protection Authority After Revision 5

AI output is a narrow declarative schema.

The draft snapshots the validated experiment, source identity, contract rule authority, and proposed protection text.

The human may only accept, edit the statement, or reject.

Confirmed artifacts are revalidated before verification. Rejected artifacts cannot verify.

No verification-time replacement experiment data is accepted.

---

## 13. Verification Authority After Revision 5

The baseline evaluator is a compatibility witness, not history.

Verification is strictly sequential:

1. artifact revalidation
2. baseline replay
3. exact baseline identity comparison
4. immediate terminal return on baseline failure
5. only then improved replay
6. complete or exact partial deterministic result

For complete improved replay, regression and source-survival failures are both reported in fixed precedence:

```text
1. regression-detected
2. source-finding-still-survives
```

`improvement = baseline survivor count - after survivor count` remains descriptive only and is `null` on partial runs.

---

## 14. Determinism Contract

Revision 5 leaves no documented implementation choice for:

- replay attack count/schema constraints
- generator-output shape
- draft/confirmed/rejected artifact shape
- decision shape
- unknown/extra fields
- serialized artifact revalidation
- baseline execution failure result fields
- improved execution failure result fields
- positive-control partial result fields
- attack-ID array ordering
- complete-replay failure precedence
- partial-state metric nullability

If implementation discovers a genuine unavoidable choice outside these contracts, architecture must be amended before code proceeds rather than silently choosing behavior.

---

## 15. Scope

This PR remains documentation-only:

```text
docs/M10_CONTRACT_REMEDIATION_SPEC.md
docs/M10_ARCHITECTURE_AUDIT.md
```

Expected implementation touches:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to change either requires explicit architecture amendment first.

---

## 16. Required Revision 5 Proofs

Implementation must prove:

- full replay projection satisfies M8 generator validation before model drafting
- >20 attacks and missing required replay strings fail before generator execution
- exact generator/draft/decision/confirmed/rejected schemas
- extra/unknown fields fail closed
- model/executable/non-AI-safe data fail closed
- serialized/reloaded artifacts are revalidated
- baseline mismatch prevents improved execution
- baseline abort returns exact field values
- improved positive-control and other improved aborts return their exact partial shapes
- all diagnostic attack-ID arrays use bound attack order
- survivor order remains rank order
- simultaneous complete-replay failures use fixed reason precedence
- experiment remains independent from mutable legacy result fields
- cross-realm replay fidelity is preserved or result is non-replayable
- existing M8 public behavior remains unchanged

---

## 17. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or under-specification in:

- experiment completeness/ownership/replayability
- full M8 replay-schema equivalence
- evaluator-facing replay fidelity
- task/case/attack/outcome authority
- protection generator/artifact/decision schemas
- human authorization
- serialized artifact revalidation
- baseline-before-improved ordering
- exact partial-state result objects
- deterministic ID-array ordering
- deterministic failure precedence
- source/regression correctness
- metric semantics

The review boundary explicitly treats implementation-choice ambiguity as architecture-blocking. The goal is to stop the review loop before implementation, not defer ambiguity into code.

Out of scope remains cryptographic attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic source patching, universal future-attack proof, and a generic sandbox.
