# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 9
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe M10 architecture that can move a confirmed M8 contract attack into human-authorized remediation while preserving M8 authority boundaries and leaving no material V1 behavior implementation-dependent?

## 2. Preserved Boundaries

AI output remains declarative only. Human confirmation is mandatory. The caller owns executable evaluator changes. Gotcha verifies behavior only against the exact bound M8 experiment through the existing evaluator boundary.

M10 accepts no verification-time replacement contract, case, attack set, task, rule authority, or baseline history.

## 3. Revision History

- Revision 1: initial remediation architecture.
- Revision 2: removed verification-time case/attack rebinding.
- Revision 3: moved experiment authority to M8 and bound historical outcomes/order/top finding.
- Revision 4: closed realm provenance, ownership, baseline gating, task identity, retained-set, and failure-state gaps.
- Revision 5: locked replay-schema parity, artifact schemas, partial outputs, and ID ordering.
- Revision 6: locked required experiment variants, generator input, positive-control separation, and verification protection payload.
- Revision 7: locked structural replay eligibility, async-generator behavior, public-options validation, and phase-aware positive-control truth.
- Revision 8: locked artifact cross-field binding, normalized baseline/after payloads, and sparse-array alignment.
- Revision 9: closes serialization and ownership gaps by making replayability JSON-stable across case and attack outputs, excluding null-prototype and shared-identity values, deep-snapshotting confirmation outputs, and defining `sourceFindingCaught` independently of overall pass/fail.

## 4. Revision 9 Principle — Replayable Means Wire-Stable

The recurring architecture risk was not evaluator execution itself; it was claiming exact replay after an artifact had been serialized and reloaded while allowing values whose semantics ordinary serialized data cannot preserve.

Revision 9 collapses these edge cases into one conservative rule: replayable V1 values must be JSON-stable local plain data.

The rule is applied to:

- original pre-canonicalization input;
- original pre-canonicalization expected output;
- every retained attack output.

Allowed structures are only finite JSON-compatible scalars, dense local Arrays, and ordinary local Objects with `Object.prototype`.

The following are explicitly non-replayable V1:

- null-prototype objects;
- sparse arrays;
- repeated/shared object identity;
- cycles;
- cross-realm/custom prototypes;
- accessors, Proxies, functions, Promises, typed arrays, Date/Map/Set/RegExp and other exotics;
- non-finite numbers and other non-wire-stable scalars.

This intentionally narrows M10 replayability below M8 general AI-data support.

## 5. Closure of Revision 8 P1 — Null Prototype Serialization

Revision 8 allowed null-prototype case objects. Ordinary JSON reload recreates them as normal objects, so an evaluator could distinguish the original value from the reloaded artifact.

Revision 9 removes that ambiguity entirely: null-prototype objects are not replayable V1.

No custom graph/prototype serialization format is introduced. That remains explicitly out of scope.

## 6. Closure of Revision 8 P1 — Shared Identity in Attack Outputs

M8 AI-data may accept repeated object identity, but JSON reload does not preserve aliasing.

Revision 9 applies the repeated-identity/cycle rejection rule to every retained attack output, not only case input/expected output.

An output such as `{ a: shared, b: shared }` therefore makes the successful M8 run emit the non-replayable experiment variant.

The verifier never claims exact replay for an attack whose evaluator behavior can depend on aliasing that the wire representation loses.

## 7. Supported Artifact Wire Invariant

For admitted replayable values, the supported v1 wire semantics are ordinary JSON stringify/parse using captured untampered intrinsics.

Replayable validation requires that the parsed structure remains within the exact allowed local-plain subset and remains M8-deep-equal to the canonical bound snapshot.

This is not cryptographic attestation and does not preserve arbitrary JavaScript object graphs. It is a deliberately narrow deterministic replay format.

## 8. Experiment and Replay Schema Authority

Every successful M8 run emits exactly one experiment variant.

Replayable experiments bind:

- exact confirmed contract/task authority;
- exact wire-stable case snapshots;
- complete retained attack set;
- exact replay-generator fields;
- original per-attack outcomes;
- deterministic survivor order;
- top finding.

Pre-draft validation remains at least as strict as the replay-relevant M8 generator schema, including attack count, required strings, score ranges, rule authority, unchanged-output rejection, and retained-set dedupe.

## 9. Public API Boundary

All three public API option containers are validated before semantic property reads.

They reject Proxies, accessors, symbol keys, hidden/non-enumerable fields, extras, and exotic prototypes. Semantic values are taken only from validated own data descriptors.

Malformed options cause zero callback executions.

## 10. Generator Contract

The protection generator is invoked once after all pre-generator validation.

Allowed completion forms are exactly:

- direct value;
- genuine native Promise identified by captured side-effect-free Promise branding.

Synchronous throws and native-Promise rejections propagate unchanged. Arbitrary thenables are never assimilated or invoked.

Generator output remains exact declarative data and cannot alter executable authority.

## 11. Revision 9 Ownership Closure — Confirmation Must Sever Aliases

Revision 8 required artifact ownership generally but did not state strongly enough that accept/edit/reject must sever every mutable reference to the still-exposed draft.

Revision 9 makes this normative:

`confirmContractProtection()` constructs a deep independently owned returned artifact for all three decisions.

No mutable object or array reachable from the returned confirmed/rejected artifact may be the same mutable reference as an object or array reachable from the draft or decision.

This includes embedded experiment, contract, case, attacks, attack outputs, baseline outcomes/arrays, source, rule, and protection.

Required behavioral proof is bidirectional:

- later draft mutation cannot change confirmed/rejected authority;
- later decision mutation cannot change the result;
- later result mutation cannot change the original draft.

## 12. Artifact Cross-Field Authority

Every draft/confirmed/rejected artifact is revalidated from data and must bind:

```text
task === experiment.task === experiment.contract.task
source.attackId -> exactly one bound original survivor
source.ruleId === selectedAttack.ruleId
rule.id === source.ruleId === selectedAttack.rule.id
rule statement/kind/severity === selected attack snapshot
rule snapshot === active confirmed contract rule
```

Confirmation cannot rebind task/source/rule/experiment authority. Verification checks these relationships again before callbacks.

## 13. Strict Verification Ordering

Verification remains strictly sequential:

1. exact options/artifact/wire-stability/cross-field validation;
2. baseline control + replay;
3. normalize completed baseline replay;
4. exact historical identity comparison;
5. terminal return on any baseline failure;
6. only then improved control + replay;
7. normalize completed improved replay;
8. source closure + regression comparison.

The improved evaluator is never executed before baseline identity passes.

## 14. Stable Evaluator Failure Semantics

M10 uses stable M8 failure classification, not message/stack parsing:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

Positive-control truth remains phase-aware: a successful control remains `true` if a later attack evaluation aborts.

## 15. Exact Verification Payloads

Non-null `baseline` and `after` are one exact normalized schema:

```js
{
  outcomes: [
    { attackId, evaluatorResult: "PASS" | "FAIL", survived: true | false }
  ],
  survivorOrderIds: [],
  topFindingId: null
}
```

Outcome arrays use bound attack order. Survivor arrays use deterministic M8 rank order. Payloads are deep independent snapshots and expose no full mutable M8 result graph.

All semantic states use one exact top-level result field set and exact partial-state null/false/empty-array values.

## 16. Closure of Revision 8 P2 — `sourceFindingCaught`

`sourceFindingCaught` is now independent of overall verification status.

On every complete improved replay it means exactly whether the normalized after outcome for `sourceAttackId` is caught:

```text
sourceFindingCaught = after source survived === false
```

Therefore a source can be caught while verification still fails because another attack regressed. In that case:

```text
sourceFindingCaught = true
verificationPassed = false
state = regression-detected
```

A source that still survives yields `sourceFindingCaught = false`.

Partial Phase B states without a complete after replay retain the fixed `false` value.

## 17. Deterministic Comparison Semantics

Regression is `baseline caught -> after survived`.

Eliminated is `baseline survived -> after caught`.

Diagnostic ID arrays use bound experiment attack order. Survivor order remains M8 rank order.

Complete after-replay failure precedence remains:

```text
1. regression-detected
2. source-finding-still-survives
```

The public improvement metric remains:

```text
baseline.survivorOrderIds.length - after.survivorOrderIds.length
```

and is descriptive only.

## 18. Required Revision 9 Proofs

Implementation must prove:

- null-prototype case values are non-replayable;
- repeated/shared identities and cycles are non-replayable in case values and every retained attack output;
- dense ordinary local JSON-stable trees are replayable;
- supported stringify/parse round trip remains within the allowed structural class and M8-deep-equal;
- every successful M8 run emits exactly one experiment variant;
- exact options schemas reject hostile call containers without callback execution;
- generator direct/native-Promise behavior and throw/rejection propagation are exact;
- arbitrary thenables are never invoked;
- M8 legacy result mutation cannot alter experiment;
- accept/edit/reject deep-snapshot every nested artifact field away from draft and decision;
- draft/result mutations cannot cross-mutate after confirmation;
- task/source/rule/survivor rebinding rejects at confirmation and verification;
- baseline failure never executes improved evaluator;
- positive-control truth survives later attack aborts;
- baseline/after normalization is exact and independently owned;
- diagnostic ordering and complete failure precedence are deterministic;
- source caught plus unrelated regression reports `sourceFindingCaught=true` while verification fails;
- existing M8 successful behavior remains unchanged apart from additive required experiment emission.

## 19. Implementation Scope

Expected implementation touches:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to change either requires architecture amendment.

Temporary/dead validation code introduced during implementation must be removed before merge.

## 20. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or V1 implementation-choice ambiguity in:

- JSON-stable replay eligibility for case and attack outputs;
- serialized/reloaded artifact semantics;
- deep ownership from M8 result -> experiment -> draft -> confirmed/rejected -> verification result;
- exact experiment/artifact schemas;
- M8 replay-schema equivalence;
- public-options validation;
- generator async semantics;
- human/AI authority boundaries;
- task/source/rule/survivor binding;
- stable evaluator failure classification;
- strict baseline-before-improved ordering;
- phase-aware positive-control truth;
- exact baseline/after payloads and partial states;
- deterministic ID ordering/failure precedence;
- exact `sourceFindingCaught` semantics;
- source/regression/metric semantics.

Out of scope remains lossless graph/prototype serialization, cross-realm serialization, cryptographic attestation, provider adapters, dashboards, production-model execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
