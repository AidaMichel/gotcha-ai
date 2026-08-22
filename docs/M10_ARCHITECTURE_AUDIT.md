# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 6
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe M10 architecture that can move the confirmed-contract path from `GOTCHA` to measurable remediation without weakening M8, allowing experiment rebinding, allowing a later evaluator to redefine history, or leaving any public V1 artifact/result behavior implementation-dependent?

---

## 2. Boundary Preserved

M8 model-produced attacks and M10 model-produced protection intent remain declarative data only.

M10 does not execute AI-generated evaluator code, auto-apply patches, or turn model output into executable policy.

A human authorizes remediation intent. The caller supplies the executable improved evaluator. Gotcha verifies observable behavior through the established M8 evaluator/attack boundary.

---

## 3. Revision 6 Core Flow

```text
successful M8 run
  ↓
required experiment field
  ↓
replayable canonical variant OR exact non-replayable variant
  ↓
replayable only: full experiment validation
  ↓
exact generator input
  ↓
exact declarative generator output
  ↓
exact draft
  ↓
exact human decision
  ↓
exact confirmed/rejected artifact
  ↓
confirmed only: full revalidation
  ↓
baseline positive control + replay
  ↓
exact historical identity gate
  ↓
only then improved positive control + replay
  ↓
deterministic complete/partial result
```

Verification accepts only `{ protection, evaluator, improvedEvaluator }`.

---

## 4. Why Revision 6 Narrows Replay Instead of Serializing Realms

Revision 4 correctly identified that some M8-supported evaluators can observe cross-realm prototype/identity semantics. Revision 5 still left replay metadata open-ended, which prevented an exact serialized experiment schema.

Revision 6 chooses a smaller, deterministic V1 boundary:

- canonically replayable cases emit `replayable: true` with one exact `canonical-ai-data` strategy
- cases whose evaluator-visible semantics would be lost by canonical cloning remain valid M8 runs but emit the exact `replayable: false` variant
- M10 drafting rejects non-replayable variants before any model call

This preserves M8 behavior without inventing a generic realm/prototype serializer inside M10.

Cross-realm serialization is explicitly deferred beyond M10 V1.

---

## 5. Closure: Required Experiment Emission

Revision 5 said a successful M8 run “may” add an experiment, which contradicted the locked flow.

Revision 6 requires every successful M8 run to return an own `experiment` field.

Exactly two variants exist:

```text
replayable v1
non-replayable v1
```

Eligible replayable runs may not omit the artifact. Ineligible runs may not silently canonicalize.

---

## 6. Closure: Exact Replayable and Non-Replayable Schemas

Revision 6 locks exact own-key schemas for both experiment variants.

Replayable v1 contains exactly:

```text
version
kind
replayable
task
contract
case
attacks
baseline
```

Its case contains exactly:

```text
input
expectedOutput
replay
```

and replay metadata is exactly:

```js
{
  version: 1,
  kind: "m8-evaluator-case",
  strategy: "canonical-ai-data"
}
```

Non-replayable v1 contains exactly:

```text
version
kind
replayable
task
reason
```

with exactly one reason code:

```text
EVALUATOR_CASE_NOT_CANONICALLY_REPLAYABLE
```

No optional extra payload exists in either variant.

---

## 7. Closure: Exact Replay Attack/Baseline Schemas

Every bound replay attack now has one exact key set, including rule snapshot, type/description/rationale, output, severity, and four score dimensions.

The exact projection back to M8 generator form is specified, including `output -> mutatedOutput` and the exact `scores` object.

The baseline object and baseline-outcome element schemas are exact.

Experiment validation remains replay-complete with M8's current generator contract, including maximum 20 attacks, non-empty required strings, AI-safe data, score bounds, contract authority, unchanged-output rejection, and same-rule/deep-equal dedupe.

---

## 8. Closure: Exact Generator Input

Revision 5 locked output but not the injected generator's input projection.

Revision 6 defines exactly five generator argument keys:

```text
contract
input
expectedOutput
finding
instructions
```

`finding` is exactly the selected bound attack schema, independently snapshotted.

`instructions` is one locked literal V1 string. Provider-specific additions are not allowed inside the public M10 generator argument; provider wrappers remain external.

This makes generator callback behavior and tests reproducible across implementations.

---

## 9. Closure: Baseline Positive-Control Failure

Revision 5 distinguished baseline execution failure and completed mismatch but omitted the valid-boolean-false known-good case.

Revision 6 adds the exact semantic state:

```text
baseline-positive-control-failed
```

It returns a fully specified partial result and never invokes the improved evaluator.

A boolean false is therefore not mislabeled execution failure and does not fall into implementation-defined reject behavior.

---

## 10. Closure: Separate Baseline and Improved Positive-Control Facts

The single Revision 5 `positiveControlPassed` field overloaded two phases and incorrectly allowed an unrun improved control to appear passed.

Revision 6 replaces it with:

```text
baselinePositiveControlPassed
improvedPositiveControlPassed
```

Each is exactly `true`, `false`, or `null`:

- true = that phase's control returned true
- false = that phase's control returned boolean false
- null = no semantic boolean result or phase did not run

A skipped Phase B therefore always reports `improvedPositiveControlPassed: null`.

---

## 11. Closure: Exact Verification Protection Payload

Revision 5 exposed `protection` in every result but did not define whether that meant the full confirmed artifact or only remediation text.

Revision 6 locks it to exactly:

```js
{
  statement,
  rationale
}
```

It is an independently owned snapshot from the revalidated confirmed artifact.

The full experiment is not recursively embedded into every verification result.

---

## 12. Uniform Verification Schema and Partial States

Every semantic verification result has one exact top-level key set.

Revision 6 specifies exact field values for:

```text
baseline-positive-control-failed
baseline-execution-failed
baseline-mismatch
improved-positive-control-failed
improved-execution-failed
complete improved replay
```

Partial states never omit fields.

Boundary-invalid structured inputs still reject before semantic replay begins.

---

## 13. Deterministic Ordering and Failure Precedence

Diagnostic attack-ID arrays use bound `experiment.attacks` order:

```text
baselineMismatchAttackIds
eliminatedAttackIds
regressionAttackIds
```

`survivorOrderIds` remains M8 rank order.

Phase terminal precedence is fixed by execution:

```text
1 baseline-positive-control-failed
2 baseline-execution-failed
3 baseline-mismatch
4 improved-positive-control-failed
5 improved-execution-failed
6 complete replay
```

Within a complete replay:

```text
1 regression-detected
2 source-finding-still-survives
3 verified
```

---

## 14. Authority After Revision 6

Historical authority remains the M8-bound experiment, not the caller-supplied old evaluator.

The old evaluator must reproduce exact bound history before improved execution.

AI output remains narrow declarative text under exact schemas.

The human can only accept, edit the protection statement, or reject.

Serialized/reloaded experiments and protection artifacts are revalidated from data. Prior object identity is never authority.

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

## 16. Revision 6 Proof Obligations

Implementation must prove:

- every successful M8 run emits exactly one experiment variant
- canonical replay eligibility is deterministic
- cross-realm/prototype-sensitive successful M8 cases emit non-replayable v1 rather than degraded replay
- replayable/non-replayable exact key sets reject extras/missing fields
- replay attacks project exactly into valid M8 generator candidates
- generator receives exact finding projection and exact instruction string
- generator output/draft/decision/confirmed/rejected schemas are exact
- serialized artifacts are fully revalidated
- baseline boolean false returns baseline-positive-control-failed
- baseline abort and baseline mismatch remain distinct
- improved control never appears passed if Phase B did not run
- verification protection payload is exactly statement/rationale
- every semantic state has the same top-level key set
- diagnostic ID ordering and complete-replay failure precedence are deterministic
- experiment remains independent from mutable legacy result fields
- existing M8 behavior remains unchanged apart from additive required experiment emission

---

## 17. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or implementation-choice ambiguity in:

- mandatory experiment emission
- exact replayable/non-replayable schemas
- canonical replay eligibility
- exact replay attack/baseline schemas
- exact generator input/output
- exact draft/decision/confirmed/rejected artifacts
- artifact revalidation
- baseline-before-improved execution
- baseline/improved positive-control semantics
- exact partial results
- verification protection payload
- ID-array ordering
- failure precedence
- source/regression correctness
- metric semantics

The review boundary explicitly treats implementation-choice ambiguity as architecture-blocking.

Out of scope remains cryptographic attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic source patching, universal future-attack proof, cross-realm serialization in M10 V1, and a generic sandbox.
