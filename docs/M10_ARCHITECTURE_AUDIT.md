# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 8
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe M10 architecture that can move a confirmed M8 contract attack into human-authorized remediation while preserving M8 authority boundaries and leaving no material V1 behavior implementation-dependent?

---

## 2. Preserved Boundaries

AI output remains declarative only. Human confirmation is mandatory. The caller owns executable evaluator changes. Gotcha verifies behavior by replaying the bound M8 experiment through the existing evaluator boundary.

M10 accepts no verification-time replacement contract, case, attack set, task, or baseline history.

---

## 3. Revision History

- Revision 1: initial remediation architecture.
- Revision 2: removed verification-time case/attack rebinding.
- Revision 3: moved experiment authority to the M8 run boundary and bound original outcomes/order/top finding.
- Revision 4: closed replay provenance, experiment ownership, baseline gating, task identity, retained-set, and failure-state gaps.
- Revision 5: locked replay-schema parity, artifact schemas, exact partial outputs, and ID ordering.
- Revision 6: locked required experiment variants, generator input, positive-control separation, and verification protection payload.
- Revision 7: closed deterministic replay eligibility, async-generator behavior, public-options validation, and phase-aware positive-control truth.
- Revision 8: closes the three exact-head Revision 7 findings: artifact cross-field binding, exact normalized baseline/after payloads, and sparse-array alignment with the existing M8 AI-data boundary.

---

## 4. Deterministic Replay Eligibility

Replayability is selected structurally at the M8 boundary from the original pre-canonicalization `input` and `expectedOutput` values. It never depends on evaluator observation or heuristic equivalence.

Replayable V1 is restricted to a conservative local-plain-data tree:

- null / string / boolean / finite number;
- dense local-realm Arrays with exact local `Array.prototype`, every index `0..length-1` present as an own data property, recursively eligible contents, and no extra/symbol keys;
- local-realm plain Objects with exact local `Object.prototype` or null prototype, string data properties only, recursively eligible contents;
- no repeated object identity or cycles.

Everything else is deterministically non-replayable, including sparse arrays, cross-realm prototypes, custom prototypes, Date/Map/Set/RegExp/typed arrays, Promise, Proxy, functions, accessors, and other exotics.

Revision 8 explicitly removes sparse arrays from replayable eligibility because the current M8 AI-data boundary already rejects them before successful experiment emission. Architecture and implementation can no longer disagree on an impossible replayable sparse-array case.

---

## 5. Exact Experiment Variants

Every successful M8 run emits exactly one own `experiment` field.

The replayable variant binds exact contract, canonical case snapshots, exact retained attack set, original per-attack outcomes, survivor rank order, and top finding.

The non-replayable variant contains only version/kind/replayable/task and the stable code `EVALUATOR_CASE_NOT_CANONICALLY_REPLAYABLE`.

There is no optional experiment emission and no open-ended replay metadata schema.

---

## 6. Full Replay Schema Authority

Replayable attack records project deterministically into the current M8 generator schema.

Pre-draft validation covers the complete replay-relevant M8 schema, including:

- 0..20 attacks;
- unique IDs;
- active rule authority;
- required type/description/rationale;
- output AI-data safety;
- exact score dimensions and ranges;
- contract-derived severity;
- unchanged-output rejection;
- retained-set dedupe rejection.

M10 may not knowingly remain weaker than M8 if that schema evolves before implementation.

---

## 7. Generator Async Contract

The protection generator is called exactly once after all pre-generator validation.

Allowed completion forms are exact:

- direct value;
- genuine native Promise recognized by a captured side-effect-free Promise brand check.

Synchronous throws and native Promise rejections propagate unchanged.

Arbitrary thenables are never awaited or assimilated; M10 does not call `.then`. They remain untrusted return data and fail generator-output / AI-data validation.

---

## 8. Public Options Objects

All three public API options containers have exact V1 boundary rules before semantic property reads.

Each must:

- not be a Proxy;
- have local `Object.prototype` or null prototype;
- contain exactly the required own string keys and no symbols;
- expose each required option as an enumerable own data property;
- contain no accessors, extras, or hidden non-enumerable fields.

Values are taken from validated descriptors so accessors cannot execute during destructuring/property reads. Malformed call shapes cause zero callback executions.

---

## 9. Protection Generator / Artifact Authority

The generator receives exact canonical snapshots of contract, input, expected output, selected bound attack, and one locked V1 instruction string.

Generator output is exact declarative `{ version, task, sourceAttackId, ruleId, protection: { statement, rationale } }` data.

Draft, confirmation decisions, confirmed artifact, and rejected artifact all use exact schemas. Serialized artifacts are revalidated from data at each boundary. Object identity is not authority.

Human edit may change only the protection statement.

---

## 10. Revision 8 Closure — Artifact Cross-Field Binding

Revision 7 locked exact artifact keys but did not normatively lock every relationship between those fields.

Revision 8 requires every draft/confirmed/rejected artifact to satisfy, from data:

```text
task === experiment.task === experiment.contract.task
source.attackId -> exactly one bound attack
selected bound attack -> original baseline survivor
source.ruleId === selectedAttack.ruleId
rule.id === source.ruleId === selectedAttack.rule.id
rule statement/kind/severity === selected attack rule snapshot
rule snapshot === active confirmed rule inside experiment.contract
```

The embedded experiment/source/rule authority is immutable across confirmation. Accept/edit/reject may not rebind it.

These invariants are revalidated before confirmation and again before verification. A serialized artifact edited to another task, source, rule, or non-survivor attack rejects before callbacks execute.

---

## 11. Positive-Control Truth

Positive-control fields are phase-aware:

```text
true  = control returned true, even if a later attack aborted
false = control returned false
null  = control threw, returned non-boolean, or phase did not run
```

This applies independently to baseline and improved phases.

M10 requires stable M8 failure classification sufficient to distinguish `positive-control` from `attack-evaluation` and `returned-false` from throw/non-boolean. Error message/stack parsing is forbidden.

---

## 12. Strict Verification Ordering

Verification remains strictly sequential:

1. exact options/artifact/cross-field revalidation;
2. baseline positive control + replay;
3. normalize completed baseline replay to the exact public replay-result payload;
4. exact bound-history identity comparison;
5. immediate terminal return on any baseline failure;
6. only then improved positive control + replay;
7. normalize completed improved replay to the same exact public payload;
8. source closure + regression comparison.

The improved evaluator is never executed before baseline identity passes.

---

## 13. Revision 8 Closure — Exact Baseline / After Payloads

Revision 7 required a uniform result object but left the non-null values of `baseline` and `after` open to interpretation.

Revision 8 defines one exact normalized completed-replay payload for both fields:

```js
{
  outcomes: [
    {
      attackId,
      evaluatorResult: "PASS" | "FAIL",
      survived: true | false
    }
  ],
  survivorOrderIds: [],
  topFindingId: null
}
```

Rules are exact:

- outcome entries cover every bound attack exactly once and use bound attack order;
- survivor IDs remain deterministic M8 rank order;
- top finding is first survivor or null;
- payloads are independent deep snapshots;
- no full `runContractAttacks()` result, mutable attack object, embedded experiment, callback, or error/stack object is exposed.

The public `improvement` formula is consequently defined from these normalized snapshots:

```text
baseline.survivorOrderIds.length - after.survivorOrderIds.length
```

This removes both schema ambiguity and accidental recursive/mutable result exposure.

---

## 14. Deterministic Semantic States

Baseline terminal states:

```text
baseline-positive-control-failed
baseline-execution-failed
baseline-mismatch
```

Improved partial states after baseline PASS:

```text
improved-positive-control-failed
improved-execution-failed
```

Complete improved replay failures use fixed precedence:

```text
1. regression-detected
2. source-finding-still-survives
```

Otherwise state is `verified`.

Every semantic state emits the same exact top-level result field set.

---

## 15. Result Determinism

The verification result `protection` field is exactly an independent `{ statement, rationale }` snapshot, never the recursively large confirmed artifact.

All diagnostic attack-ID arrays use bound experiment attack order. Survivor order alone uses M8 deterministic rank order.

`baseline` and `after` use the exact normalized Revision 8 replay-result schema when non-null.

`improvement` is `null` for incomplete replay pairs and otherwise uses the exact normalized survivor-order lengths.

---

## 16. Implementation Scope

Expected implementation touches:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to change either requires an architecture amendment.

Implementation must remove temporary/dead validation code before merge.

---

## 17. Required Revision 8 Proofs

Implementation must prove:

- replay eligibility is structural, conservative, getter-free, evaluator-free, deterministic, and aligned with the current M8 AI-data boundary;
- sparse arrays are not replayable V1 cases;
- cross-realm/custom/exotic/aliased/cyclic cases emit non-replayable experiment;
- dense local plain-data cases emit replayable experiment;
- every successful M8 run emits exactly one experiment variant;
- exact public options schemas reject Proxies/accessors/symbols/extras without callback execution;
- direct and native-Promise generator returns work;
- arbitrary thenables are never assimilated;
- generator throw/rejection propagation is exact;
- experiment remains independent from legacy result mutation;
- full M8 replay schema validates before generator execution;
- task/source/rule/survivor cross-field rebinding rejects at confirmation and verification;
- source attack is necessarily a bound original survivor;
- embedded rule snapshot necessarily matches selected attack and active contract rule;
- baseline failure never executes improved evaluator;
- positive-control `true` survives later attack aborts;
- stable M8 phase/reason classification replaces message parsing;
- completed baseline and after results normalize to exactly `{ outcomes, survivorOrderIds, topFindingId }`;
- normalized outcome arrays use bound attack order and no mutable/full M8 result references escape;
- partial results and diagnostic ID ordering are deterministic;
- source closure/regression gates remain identity-based;
- existing M8 successful public behavior is unchanged apart from additive required experiment emission.

---

## 18. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or V1 implementation-choice ambiguity in:

- replay eligibility and experiment variant selection aligned with M8;
- exact artifact schemas and ownership;
- artifact task/source/rule/survivor cross-field binding;
- M8 replay-schema equivalence;
- public-options validation;
- generator async semantics;
- human/AI authority boundaries;
- stable evaluator failure classification;
- strict baseline-before-improved ordering;
- phase-aware positive-control fields;
- exact normalized baseline/after payload schemas and ownership;
- exact partial results;
- deterministic ID ordering/failure precedence;
- source/regression/metric semantics.

Out of scope remains cross-realm serialization, cryptographic attestation, provider adapters, dashboards, production-model execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
