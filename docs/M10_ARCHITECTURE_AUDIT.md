# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 17
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit question

What is the smallest deterministic architecture that can turn one confirmed M8 survivor into a human-authorized declarative protection and verify an externally supplied improved evaluator against the exact bound experiment without serialization drift, prototype ambiguity, identity normalization, callback-global corruption, post-call authority races, confirmation bypass, key-order drift, or implementation-dependent result ownership?

## 2. Revision 17 principle

Revision 16 removed proposal-generator execution from the trusted M10 core. Revision 17 keeps that simplification and closes the five exact-head Revision 16 P1 findings without reopening callback architecture.

The five closures are:

1. the forbidden intrinsic-brand set is now a closed mandatory probe list with one exact unavailable-probe fallback;
2. invocation capture uses one identity set across the entire non-callback options graph and rejects repeated identities before copying;
3. schema-less evaluator-facing records preserve one exact recursive captured own-key order instead of allowing sorting/implementation choice;
4. every complete verification result is itself a tree with independently allocated nested containers and diagnostic arrays;
5. numeric validation uses captured module-start `Number.isFinite` and `Object.is` references.

No proposal callback, prototype guard, callback realm, restoration transaction, or reentrancy policy has been reintroduced.

## 3. Closed mandatory forbidden-brand set

Revision 16's phrase “at minimum all available probes” was nondeterministic because newer Node runtimes can expose additional probes.

Revision 17 names the exact mandatory set:

```text
isDate
isRegExp
isMap
isSet
isWeakMap
isWeakSet
isPromise
isNativeError
isAnyArrayBuffer
isDataView
isTypedArray
isBoxedPrimitive
isArgumentsObject
isGeneratorObject
isModuleNamespaceObject
isMapIterator
isSetIterator
isExternal
Buffer.isBuffer
```

Only these probes affect Revision-17 forbidden-brand acceptance. New runtime probes do not silently widen the rejection set.

If any mandatory probe is unavailable/non-callable at module initialization, the fallback is exact and fail-closed: M8 can emit only the non-replayable M10 experiment variant and every M10 public API asynchronously rejects with `TypeError` before semantic processing.

This gives the same V1 result independent of whether a runtime adds unrelated probes such as `isCryptoKey` later.

## 4. Aliases cannot be normalized away during capture

Invocation-time capture now owns one identity set for the complete non-callback options graph.

The first encounter of a container registers its identity before descendant traversal. Any second encounter fails capture immediately. Cycles fail by the same rule.

Therefore an input such as:

```text
experiment.case.input.a === experiment.case.expectedOutput.b
```

cannot be copied twice into two fresh independent records and later pass the whole-experiment tree check. The invalid alias is rejected at the first authority boundary rather than normalized into valid-looking data.

Callback function identities are captured directly and excluded from data-graph traversal.

## 5. Schema-less wire key order is evaluator-facing authority

Schema records still use canonical schema property order.

The important exception is arbitrary wire data inside:

```text
case.input
case.expectedOutput
attack.output
```

These records have no schema that can define a replacement order, and evaluators may observe `Object.keys` or `Reflect.ownKeys`.

Revision 17 therefore makes their captured string own-key sequence part of V1 semantic authority:

- validate the captured `Reflect.ownKeys` sequence;
- preserve that sequence exactly when deep-snapshotting;
- recurse with the same rule into nested schema-less records;
- require JSON-reloaded records to reproduce the same sequence;
- never lexically sort or schema-normalize schema-less keys.

This preserves historical evaluator-facing key order instead of creating a replay-dependent normalization choice.

## 6. Complete verification-result ownership

Revision 17 applies the same tree invariant used for experiments and protection artifacts to the entire public verification result.

Every non-null nested record and Array is allocated for one path only. In particular, empty arrays are not shared merely because their contents are equal.

This rejects/forbids constructions such as:

```text
result.baselineMismatchAttackIds === result.eliminatedAttackIds
```

Before verification resolves, the complete result must satisfy `isTreeGraphV1`. Internal construction that violates the invariant rejects with `TypeError`; an aliasing result is never exposed.

JSON therefore cannot silently de-alias a valid public result and change its mutation semantics.

## 7. Numeric validation is captured

`isWireNumberV1` now uses only captured module-start references:

```text
capturedNumberIsFinite(value)
capturedObjectIs(value, -0)
```

Mutating `Number.isFinite` or `Object.is` later cannot alter replayability or allow `Infinity`, `NaN`, or signed zero to cross the wire boundary.

This matches the existing captured-intrinsic treatment of trim, JSON, descriptor access, Proxy detection, and other authority-sensitive operations.

## 8. Final authority chain

```text
module-start captured intrinsics + mandatory probe capability
  -> validated M8 case before callbacks
  -> frozen case eligibility + owned canonical case snapshots
  -> schema-less key-order-preserving retained attack/output snapshots
  -> complete tree candidate experiment
  -> prototype-baseline + JSON experiment probe
  -> emitted replayable experiment
  -> external adapter obtains declarative proposal
  -> invocation-time descriptor/brand/identity capture
  -> owned experimentAuthority
  -> exact proposal authority binding
  -> complete tree draft
  -> final artifact JSON probe
  -> invocation-time confirmation capture
  -> complete tree confirmed/rejected artifact
  -> final artifact JSON probe
  -> invocation-time verification capture
  -> owned verificationAuthority
  -> baseline replay with preserved evaluator-facing wire order
  -> exact historical identity gate
  -> improved replay
  -> independently allocated complete-tree verification result
```

No later phase rereads mutable caller authority. No M10 proposal-generation callback executes.

## 9. Replayability and data boundary

Replayable V1 remains intentionally narrow:

- null/string/boolean;
- finite numbers except `-0` using captured numeric intrinsics;
- dense local Arrays;
- local Object-prototype data records that pass the exact mandatory forbidden-brand set;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no cycles or repeated identity;
- schema-less wire records preserve captured recursive own-key order;
- exact signed-zero-safe attack scores.

Experiments, protection artifacts, and verification results are complete trees. Experiments and protection artifacts must survive the supported JSON round trip without semantic, order, or identity drift.

## 10. Public completion model

All three public APIs remain genuine-local-native-Promise-only.

Invocation capture occurs synchronously before Promise return but exposes no synchronous validation-error channel. Capture/schema/authority failures reject asynchronously with `TypeError`.

Drafting executes no model/provider/proposal callback.

Only evaluator callbacks remain executable in M10 and are delegated to the existing M8 evaluator execution boundary. Classified evaluator failures resolve deterministic semantic states.

## 11. Human and historical authority

Drafting returns only `draft`.

Confirmation accepts only `draft` and maps:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only a valid confirmed complete-tree artifact.

The baseline evaluator is a compatibility witness. Historical authority remains the bound experiment: every per-attack classification, survivor order, and top finding must match before improved evaluation begins.

## 12. Required proof obligations

Implementation must prove at least:

- the forbidden-brand list is exactly the Revision-17 mandatory list and extra runtime probes do not alter V1 acceptance;
- missing any mandatory probe triggers the exact fail-closed fallback;
- prototype-rewritten covered intrinsic exotics reject before normalization;
- captured `Number.isFinite`, captured `Object.is`, and captured trim remain authoritative after global mutation;
- invocation capture rejects repeated identities/cycles across the complete non-callback options graph before copying;
- no invalid alias can be normalized into a valid tree;
- immediate caller mutation after API return cannot alter captured authority;
- drafting executes no provider/model/proposal callback;
- proposal data is exact, local, declarative, and rebound to experiment task/source/rule authority;
- schema-less wire records preserve recursive captured own-key order through snapshot, JSON reload, and evaluator replay;
- accepted experiments and protection artifacts are whole trees before and after JSON round trip;
- every verification result is a complete tree, with independently allocated diagnostic arrays and replay payloads;
- prototype-baseline checks include Object/Array prototype-chain identity plus own `toJSON` absence before wire operations;
- empty/whitespace protection text rejects on every artifact boundary;
- huge/escape-heavy proposal/edit text cannot yield an unserializable returned artifact;
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

Provider/model adapters are outside this architecture PR and can be implemented later around the declarative proposal boundary without changing trusted authority semantics.

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

Lossless arbitrary graph/prototype serialization, cryptographic attestation, dashboards, production-model execution inside M10 core, generated evaluator code, automatic patching, and unrelated engine redesign remain out of scope.

## 14. Stopping rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 17 spec.
