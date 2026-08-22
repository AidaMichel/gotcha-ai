# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 7
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
- Revision 7: closes the final exact-head Revision 6 findings with a structural replay-eligibility algorithm, exact async-generator contract, exact public-options validation, and phase-aware positive-control truth.

---

## 4. Revision 7 P1 Closure — Deterministic Replay Eligibility

Revision 6 still described replayability in observational terms: canonical replay had to preserve every evaluator-observable semantic. That was not an implementable predicate.

Revision 7 removes evaluator observation from eligibility entirely.

M8 now classifies a successful run by applying one exact structural predicate to the original pre-canonicalization `input` and `expectedOutput` values.

Replayable V1 is intentionally restricted to a conservative local-plain-data tree:

- null / string / boolean / finite number;
- local-realm Arrays with exact local `Array.prototype`, index data properties only, recursively eligible contents, and no extra/symbol keys;
- local-realm plain Objects with exact local `Object.prototype` or null prototype, string data properties only, recursively eligible contents;
- no repeated object identity or cycles.

Everything else is deterministically non-replayable, including cross-realm prototypes, custom prototypes, Date/Map/Set/RegExp/typed arrays, Promise, Proxy, functions, accessors, and other exotics.

The same structure therefore always produces the same experiment variant without executing an evaluator or getter.

This is deliberately conservative: M8 validity is broader than M10 V1 replayability.

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

## 7. Revision 7 P2 Closure — Generator Async Contract

The protection generator is called exactly once after all pre-generator validation.

Allowed completion forms are now exact:

- direct value;
- genuine native Promise recognized by a captured side-effect-free Promise brand check.

Synchronous throws and native Promise rejections propagate unchanged.

Arbitrary thenables are never awaited or assimilated; M10 does not call `.then`. They remain untrusted return data and fail generator-output / AI-data validation.

This preserves async model-provider adapters without introducing untrusted thenable execution.

---

## 8. Revision 7 P2 Closure — Public Options Objects

All three public API options containers now have exact V1 boundary rules before semantic property reads.

Each must:

- not be a Proxy;
- have local `Object.prototype` or null prototype;
- contain exactly the required own string keys and no symbols;
- expose each required option as an enumerable own data property;
- contain no accessors, extras, or hidden non-enumerable fields.

Values are taken from validated descriptors so accessors cannot execute during destructuring/property reads.

Malformed call shapes cause zero callback executions.

---

## 9. Protection Generator / Artifact Authority

The generator receives exact canonical snapshots of contract, input, expected output, selected bound attack, and one locked V1 instruction string.

Generator output is exact declarative `{ version, task, sourceAttackId, ruleId, protection: { statement, rationale } }` data.

Draft, confirmation decisions, confirmed artifact, and rejected artifact all use exact schemas. Serialized artifacts are revalidated from data at each boundary. Object identity is not authority.

Human edit may change only the protection statement.

---

## 10. Revision 7 P2 Closure — Positive-Control Truth

Revision 6 could erase a successful positive control when a later attack evaluation aborted.

Revision 7 makes positive-control fields phase-aware:

```text
true  = control returned true, even if a later attack aborted
false = control returned false
null  = control threw, returned non-boolean, or phase did not run
```

This applies independently to baseline and improved phases.

M10 requires stable M8 failure classification sufficient to distinguish `positive-control` from `attack-evaluation` and `returned-false` from throw/non-boolean. Error message/stack parsing is forbidden.

---

## 11. Strict Verification Ordering

Verification remains strictly sequential:

1. exact options/artifact revalidation;
2. baseline positive control + replay;
3. exact bound-history identity comparison;
4. immediate terminal return on any baseline failure;
5. only then improved positive control + replay;
6. source closure + regression comparison.

The improved evaluator is never executed before baseline identity passes.

---

## 12. Deterministic Semantic States

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

## 13. Result Determinism

The verification result `protection` field is exactly an independent `{ statement, rationale }` snapshot, never the recursively large confirmed artifact.

All diagnostic attack-ID arrays use bound experiment attack order. Survivor order alone uses M8 deterministic rank order.

`improvement` remains exactly:

```text
baseline survivor count - after survivor count
```

and is `null` for incomplete replay pairs.

---

## 14. Implementation Scope

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

## 15. Required Revision 7 Proofs

Implementation must prove:

- replay eligibility is structural, conservative, getter-free, evaluator-free, and deterministic;
- cross-realm/custom/exotic/aliased/cyclic cases emit non-replayable experiment;
- local plain-data cases emit replayable experiment;
- every successful M8 run emits exactly one experiment variant;
- exact public options schemas reject Proxies/accessors/symbols/extras without callback execution;
- direct and native-Promise generator returns work;
- arbitrary thenables are never assimilated;
- generator throw/rejection propagation is exact;
- experiment remains independent from legacy result mutation;
- full M8 replay schema validates before generator execution;
- baseline failure never executes improved evaluator;
- positive-control `true` survives later attack aborts;
- stable M8 phase/reason classification replaces message parsing;
- partial results and ID ordering are deterministic;
- source closure/regression gates remain identity-based;
- existing M8 successful public behavior is unchanged apart from additive required experiment emission.

---

## 16. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or V1 implementation-choice ambiguity in:

- replay eligibility and experiment variant selection;
- exact artifact schemas and ownership;
- M8 replay-schema equivalence;
- public-options validation;
- generator async semantics;
- human/AI authority boundaries;
- stable evaluator failure classification;
- strict baseline-before-improved ordering;
- phase-aware positive-control fields;
- exact partial results;
- deterministic ID ordering/failure precedence;
- source/regression/metric semantics.

Out of scope remains cross-realm serialization, cryptographic attestation, provider adapters, dashboards, production-model execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
