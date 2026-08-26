# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 18
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit question

What is the smallest deterministic architecture that can turn one confirmed M8 survivor into a human-authorized declarative protection and verify an externally supplied improved evaluator against the exact bound experiment without serialization drift, prototype ambiguity, identity normalization, post-call authority races, confirmation bypass, key-order drift, legacy-result aliasing, or implementation-dependent boundary behavior?

## 2. Revision 18 principle

Revision 18 keeps the Revision 16 simplification that trusted M10 core does not execute proposal/model callbacks and closes the five exact-head Revision 17 P1 findings without widening architecture.

The five closures are:

1. all three public option records have exact top-level key/descriptor/prototype schemas;
2. verification reruns the exact completed-artifact wire probe before either evaluator executes;
3. M8 unchanged/duplicate attack filtering has one explicit equality rule: object insertion order is ignored for retention, so order-only mutations are not distinct V1 attacks, while retained output key order remains replay authority;
4. accepted Arrays require one exact writable/non-enumerable/non-configurable `length` descriptor;
5. replayable `experiment` is fully identity-disjoint from every sibling/legacy M8 result path.

No provider callback, global prototype guard, callback-realm projection, or new engine-level architecture is introduced.

## 3. Exact public option records

Revision 17 gave exact signatures but did not define whether extra wrapper keys were legal.

Revision 18 makes each public wrapper a closed local record:

```text
draft   -> experiment, sourceAttackId, proposal
confirm -> draft, decision
verify  -> protection, evaluator, improvedEvaluator
```

No extras, symbols, accessors, non-enumerable fields, Proxies, or non-local prototypes are accepted.

This check happens from captured descriptors at invocation time. Validation still surfaces only as asynchronous native-Promise rejection with `TypeError`.

## 4. Verification reruns artifact wire safety

A confirmed artifact may be reconstructed, stored, copied between processes, or presented after mutable prototype state changes.

Therefore verification may not infer current wire safety from the fact that drafting or confirmation once succeeded.

Revision 18 defines one `probeCompletedProtectionArtifactV1()` operation shared by all artifact boundaries. Verification invokes it on the invocation-captured confirmed artifact before creating verification authority or calling either evaluator.

A current size/nesting/prototype-baseline/JSON/revalidation failure rejects with `TypeError` before callback execution.

## 5. Attack equality and schema-less key order no longer conflict

Schema-less key order remains evaluator-visible replay authority for retained values.

However, current M8 filtering historically treats plain-object key insertion order as irrelevant when deciding whether an output is unchanged or duplicates another same-rule output.

Revision 18 makes that distinction explicit rather than silently changing M8 behavior:

- `isM8AttackFilterEqualV1` ignores plain-object key insertion order for unchanged-output and same-rule duplicate filtering;
- an order-only object-key permutation is therefore not a distinct retained V1 attack;
- once an attack is retained for a substantive value/shape difference, the exact historical key order of its output is preserved through experiment snapshot, JSON reload, and evaluator replay.

This removes the implementation choice without expanding the attack set.

## 6. Exact Array length descriptor

The accepted V1 Array boundary now requires own `length` exactly:

```text
value = actual integer length
writable = true
enumerable = false
configurable = false
```

A frozen Array with non-writable length therefore rejects instead of being normalized differently by different implementations.

The same rule applies during invocation capture, schema arrays, and schema-less wire Arrays.

## 7. Experiment is an ownership island inside M8 result

A tree check starting at `result.experiment` cannot detect references shared with sibling result fields.

Revision 18 therefore adds a second ownership invariant: every Object/Array reachable from a replayable experiment must be identity-disjoint from every Object/Array reachable from every other M8 result path, including `generatedAttacks`, attack result structures, top finding, and retained/ranked survivor compatibility fields.

M8 must build the experiment from independent deep-owned snapshots. Mutating any legacy result path after return cannot change experiment authority.

If disjoint ownership cannot be established safely, M8 emits the non-replayable experiment variant.

## 8. Final authority chain

```text
module-start captured intrinsics + mandatory probe capability
  -> exact public option-wrapper capture
  -> validated M8 case before callbacks
  -> frozen case eligibility + owned canonical case snapshots
  -> retained attack/output snapshots
  -> complete tree candidate experiment
  -> experiment disjoint from all legacy M8 result paths
  -> prototype-baseline + JSON experiment probe
  -> emitted replayable experiment
  -> external adapter obtains declarative proposal
  -> invocation-time descriptor/brand/identity capture
  -> owned experimentAuthority
  -> exact proposal authority binding
  -> complete tree draft
  -> completed-artifact wire probe
  -> invocation-time confirmation capture
  -> complete tree confirmed/rejected artifact
  -> completed-artifact wire probe
  -> invocation-time verification capture
  -> verification-time completed-artifact wire probe
  -> owned verificationAuthority
  -> baseline replay
  -> exact historical identity gate
  -> improved replay
  -> independently allocated complete-tree verification result
```

No later phase rereads mutable caller authority. No M10 proposal-generation callback executes.

## 9. Replayability and data boundary

Replayable V1 remains intentionally narrow:

- null/string/boolean;
- finite numbers except `-0` using captured numeric intrinsics;
- dense local Arrays with exact writable length descriptor;
- local Object-prototype data records that pass the exact mandatory forbidden-brand set;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no cycles or repeated identity;
- schema-less retained wire records preserve captured recursive own-key order;
- order-only key permutations are excluded as distinct attacks at M8 retention time;
- exact signed-zero-safe attack scores;
- replayable experiment containers are disjoint from all sibling M8 result containers.

Experiments, protection artifacts, and verification results remain complete trees. Experiments and protection artifacts must survive the supported JSON round trip without semantic, order, or identity drift.

## 10. Public completion model

All three public APIs remain genuine-local-native-Promise-only.

Invocation capture occurs synchronously before Promise return but exposes no synchronous validation-error channel. Capture/schema/authority/wire-boundary failures reject asynchronously with `TypeError`.

Drafting executes no model/provider/proposal callback.

Only evaluator callbacks remain executable in M10 and are delegated to the existing M8 evaluator execution boundary. Verification performs all artifact boundary checks before the first evaluator.

## 11. Human and historical authority

Drafting returns only `draft`.

Confirmation accepts only `draft` and maps:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only a currently valid, freshly re-probed confirmed complete-tree artifact.

The baseline evaluator is a compatibility witness. Historical authority remains the bound experiment: every per-attack classification, survivor order, and top finding must match before improved evaluation begins.

## 12. Required proof obligations

Implementation must prove at least:

- each public top-level options object accepts exactly its named keys and rejects extras/accessors/symbols/Proxies/non-local prototypes;
- the exact mandatory forbidden-brand list and fail-closed missing-probe behavior remain unchanged;
- captured `Number.isFinite`, captured `Object.is`, and captured trim remain authoritative after global mutation;
- exact Array length descriptor acceptance rejects frozen/non-writable-length Arrays;
- invocation capture rejects repeated identities/cycles before copying;
- immediate caller mutation after API return cannot alter captured authority;
- drafting executes no provider/model/proposal callback;
- proposal data is exact, local, declarative, and rebound to experiment task/source/rule authority;
- schema-less retained wire records preserve recursive captured own-key order through snapshot, JSON reload, and evaluator replay;
- order-only object-key permutations are filtered as unchanged/duplicate and are not retained as V1 attacks;
- every replayable experiment container is identity-disjoint from every other M8 result path;
- mutating `generatedAttacks`, attack results, top finding, or compatibility fields cannot mutate `result.experiment`;
- accepted experiments and protection artifacts are whole trees before and after JSON round trip;
- verification reruns the exact completed-artifact wire probe before evaluator execution;
- verification-time JSON size/nesting/prototype-baseline failure rejects with `TypeError` and neither evaluator runs;
- every verification result is a complete tree with independently allocated diagnostic arrays and replay payloads;
- signed-zero, severity, ordering, draft-only confirmation, evaluator-state mapping, baseline identity, and complete failure-reason semantics remain exact.

## 13. Scope

Expected implementation files:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

No callback-realm/prototype-guard helper is required.

Provider/model adapters remain outside this architecture PR and can be implemented later around the declarative proposal boundary without changing trusted authority semantics.

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

Lossless arbitrary graph/prototype serialization, cryptographic attestation, dashboards, production-model execution inside M10 core, generated evaluator code, automatic patching, and unrelated engine redesign remain out of scope.

## 14. Stopping rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 18 spec.
