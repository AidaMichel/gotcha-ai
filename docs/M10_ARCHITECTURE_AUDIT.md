# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 10
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe M10 architecture that can move a confirmed M8 contract attack into human-authorized remediation while preserving M8 authority boundaries and eliminating material V1 implementation-choice ambiguity?

## 2. Revision 10 Closure Strategy

Revision 10 replaces accumulating one-off edge-case rules with four reusable normative boundary primitives:

1. `isExactDataContainerV1` — one exact record/container validation model for options, experiments, artifacts, nested authority records, generator I/O, replay results, and semantic results.
2. `isAcceptedCallbackV1` — one exact callback acceptance rule: `typeof === "function"` plus non-Proxy, with no realm or function-kind restriction.
3. `isWireReplayableV1` — one replayability predicate that includes the actual captured `JSON.stringify`/`JSON.parse` round-trip before a run can be labeled replayable.
4. `deepOwnedSnapshotV1` — one ownership rule used at M8 experiment emission, draft creation, confirmation, normalization, and verification authority capture.

The architecture intentionally becomes narrower and simpler rather than adding a lossless arbitrary-JavaScript serialization system.

## 3. Revision History

- Revision 1: initial remediation architecture.
- Revision 2: removed verification-time case/attack rebinding.
- Revision 3: moved experiment authority to M8 and bound historical outcomes/order/top finding.
- Revision 4: closed realm provenance, ownership, baseline gating, task identity, retained-set, and failure-state gaps.
- Revision 5: locked replay-schema parity, artifact schemas, partial outputs, and ID ordering.
- Revision 6: locked experiment variants, generator input, positive-control separation, and result protection payload.
- Revision 7: locked structural replay eligibility, async generator behavior, public options validation, and phase-aware positive-control truth.
- Revision 8: locked artifact cross-field binding, normalized baseline/after payloads, and sparse-array alignment.
- Revision 9: narrowed replayability to JSON-stable local plain data and severed confirmation aliases.
- Revision 10: closes actual stringify failure, draft ownership, pre-callback verification authority capture, mismatch-ID membership, nested artifact container validation, and callback acceptance ambiguity through shared primitives.

## 4. Exact Container Boundary

Every schema-bearing object in M10 uses the same exact container rule before semantic reads:

- non-Proxy;
- exact local `Object.prototype`;
- exact own string key set;
- no symbols;
- enumerable own data properties only;
- no accessors, non-enumerable fields, extras, null/custom/cross-realm prototypes, or exotic containers.

This rule applies recursively to experiments, case/replay records, attack/rule records, baseline/outcome records, public API options, generator input/output, artifacts, decisions, normalized replay results, and semantic results.

This removes the previous gap where options were strict but reconstructed nested artifacts could be interpreted differently by conforming implementations.

## 5. Exact Callback Boundary

`generator`, `evaluator`, and `improvedEvaluator` are accepted iff:

```text
typeof value === "function"
and value is not a Proxy
```

There is no realm restriction and no function-kind/source-code/constructor restriction.

Thus ordinary, bound, native, arrow, async, generator-function, callable-function-object, and cross-realm functions are accepted when non-Proxy. Proxied callables reject before invocation.

This aligns with M8's broad callable behavior without leaving “trusted local” as an unimplementable predicate.

## 6. Replayability Includes the Actual Wire Probe

Revision 9 structurally described JSON-stable data but allowed a sufficiently deep otherwise-valid tree to pass structural eligibility even when `JSON.stringify` throws.

Revision 10 makes successful wire serialization part of eligibility itself.

A replayable case/attack value must first be a dense local ordinary JSON-compatible tree with no repeated identities/cycles/accessors/Proxies/exotics. It then must successfully complete captured untampered:

```text
JSON.stringify(value)
JSON.parse(serialized)
```

The parsed result must remain in the same admitted structural class and be M8-deep-equal to the canonical in-memory snapshot.

If stringify or parse throws for any reason, including runtime nesting limits, the value is non-replayable. Therefore a successful M8 run can never be labeled replayable while failing the exact supported wire operation required by its artifact semantics.

The same predicate is required for original input, original expected output, and every retained attack output.

## 7. Ownership Chain Is Continuous

Revision 10 explicitly closes every public ownership transition:

```text
M8 mutable legacy result
  -> independently owned experiment
caller experiment + generator returned data
  -> independently owned draft
caller draft + decision
  -> independently owned confirmed/rejected artifact
caller confirmed artifact
  -> independently owned verificationAuthority before callbacks
M8 replay internals
  -> independently owned normalized baseline/after/result
```

No mutable object/array identity is authority across these transitions.

This is structural ownership, not cryptographic provenance.

## 8. Draft Ownership Closure

`draftContractProtection()` does not shallowly embed the caller experiment or the generator's returned object.

After both validate, the draft is constructed from independently owned snapshots. Later mutation of either the caller-supplied experiment or a generator-retained output object cannot change the draft shown to the human or the artifact later confirmed.

This closes the Revision 9 draft-alias P1 directly.

## 9. Confirmation Ownership Closure

Accept, edit, and reject all construct fresh independently owned artifacts from validated draft/decision data.

No mutable nested reference is retained from draft or decision. Editing changes only the human-authorized protection statement.

Draft mutation cannot change confirmed authority; result mutation cannot change draft; decision mutation cannot change result.

## 10. One Verification Authority Snapshot Before Baseline

Validation alone is insufficient if the caller artifact remains mutable during evaluator execution.

Revision 10 therefore requires `verifyContractProtection()` to create one complete independently owned `verificationAuthority` before the first baseline callback.

It contains every datum needed by either phase or the public result: task/source/rule authority, protection text, case, complete attack set, bound history, and replay generator data.

After creation, verification never reads replay/authority/protection data from the caller-supplied artifact again.

Baseline and improved replays both derive only from this same snapshot. A baseline evaluator that mutates the caller artifact cannot affect Phase B.

## 11. Baseline Identity and Mismatch IDs

Baseline identity remains three-part:

- per-attack classifications;
- survivor order;
- top finding.

`baselineMismatchAttackIds` now has exact membership semantics: it contains exactly those bound attack IDs whose replayed `survived` classification differs from bound history, in bound attack order.

Ranking-only or top-finding-only mismatch with identical classifications returns an empty mismatch-ID array while still producing `baseline-mismatch`.

Incomplete callback execution is `baseline-execution-failed`, never mismatch.

## 12. Strict Verification Ordering

Verification order is locked:

1. exact options validation;
2. callback acceptance validation;
3. full confirmed artifact/nested-container/wire/cross-field validation;
4. build one independently owned verification authority snapshot;
5. baseline positive control + replay;
6. normalize baseline;
7. exact historical identity gate;
8. immediate terminal return on any baseline failure;
9. only then improved positive control + replay from the same snapshot;
10. normalize improved replay;
11. source closure + regression comparison.

The improved evaluator is never invoked before baseline identity passes.

## 13. Deterministic Result Semantics

Non-null `baseline` and `after` have one exact normalized schema:

```js
{
  outcomes: [
    { attackId, evaluatorResult: "PASS" | "FAIL", survived: true | false }
  ],
  survivorOrderIds,
  topFindingId
}
```

Outcome order is bound attack order. Survivor order is M8 deterministic rank order. Result payloads are independently owned and expose no full mutable M8 result graph.

`sourceFindingCaught` is the complete after-replay caught classification for the selected source, independent of regressions and overall pass/fail.

Complete failure precedence remains:

```text
1. regression-detected
2. source-finding-still-survives
```

The public improvement metric remains baseline survivor count minus after survivor count and is descriptive only.

## 14. Required Revision 10 Proofs

Implementation must prove:

- every named nested schema container follows the universal exact-container boundary;
- Proxies/accessors/symbols/extras/invalid prototypes reject before semantic reads;
- callback acceptance equals function + non-Proxy across ordinary/async/bound/native/cross-realm cases;
- proxied callables reject before execution;
- replayability includes successful actual stringify/parse;
- deeply nested plain data that makes stringify throw is non-replayable;
- case and every attack output use the same wire predicate;
- legacy result cannot mutate experiment;
- caller experiment and generator-retained object cannot mutate draft after return;
- draft/decision cannot mutate confirmed/rejected artifact;
- baseline evaluator mutation of caller artifact cannot affect improved replay or result protection;
- baseline mismatch IDs contain exactly classification-different IDs in bound order;
- ranking-only/top-finding-only mismatch yields empty mismatch IDs;
- baseline failure never executes improved evaluator;
- normalized results contain exact keys and no mutable/full M8 aliases;
- source caught plus unrelated regression yields `sourceFindingCaught=true` with verification failure.

## 15. Implementation Scope

Expected implementation remains:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to alter either requires architecture amendment first.

Temporary/dead validation code must be removed before merge.

## 16. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or V1 implementation-choice ambiguity in:

- the four shared boundary primitives;
- actual stringify/parse replay eligibility;
- exact callback acceptance;
- exact nested artifact/container validation;
- continuous ownership from M8 result through verification result;
- one verification authority snapshot before callbacks;
- strict baseline-before-improved ordering;
- exact baseline mismatch ID membership;
- exact normalized results/partial states;
- source/regression/improvement semantics.

Out of scope remains lossless arbitrary graph/prototype serialization, cross-realm serialization, cryptographic provenance, provider adapters, dashboards, production-model execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
