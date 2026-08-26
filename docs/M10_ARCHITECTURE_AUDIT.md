# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 15
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit question

What is the smallest deterministic architecture that can turn one confirmed M8 survivor into a human-authorized declarative protection and verify an externally supplied improved evaluator against the exact bound experiment without serialization drift, prototype normalization, identity aliasing, callback prototype corruption, post-call authority races, confirmation bypass, or implementation-dependent result states?

## 2. Revision 15 principle

Revision 15 closes the five exact-head Revision 14 P1 findings by strengthening shared primitives rather than adding special cases:

- invocation capture validates rejection-relevant source prototypes before copying, so forbidden containers cannot be normalized into valid local records;
- the generator callback projection has one exact observable record/array boundary, including realm prototypes, own keys, descriptors, length semantics, and extensibility;
- every protection artifact status explicitly requires non-empty statement and rationale;
- generator execution is protected by one exclusive local Object/Array-prototype guard across synchronous and native-Promise completion, with exact restoration before release;
- tree semantics apply to the entire completed protection artifact before and after JSON round trip, not merely its nested experiment.

All prior signed-zero, Promise-only completion, exact evaluator-state mapping, draft-only confirmation, wire probing, ownership, severity, ordering, and baseline-identity rules remain locked.

## 3. Closure of Revision 14 findings

### 3.1 Invocation capture preserves invalid prototype facts

Capture no longer copies a container first and asks whether the copied object is valid.

Before any copy, source containers are classified with captured side-effect-free intrinsics. Arrays must have Gotcha local `Array.prototype`; non-array records must have Gotcha local `Object.prototype`. Proxy, custom, null, exotic, or cross-realm containers produce an internal capture-failure sentinel.

Only containers that already satisfy the required source prototype class are copied. Therefore capture cannot turn prohibited authority into valid local authority.

### 3.2 Generator projection is observably exact

Every callback-realm record uses that realm's ordinary Object prototype, exact own string keys, writable/enumerable/configurable data properties, no symbols, and remains extensible.

Every callback-realm array uses that realm's ordinary Array prototype, dense canonical indices with writable/enumerable/configurable data descriptors, ordinary non-enumerable/non-configurable writable `length`, and remains extensible.

The same rule applies recursively, so generators cannot distinguish conforming implementations by descriptors, prototype choice, or freeze/seal/extensibility differences.

### 3.3 Protection text is validated on every artifact boundary

`protection.statement` and `protection.rationale` now explicitly satisfy `isNonEmptyStringV1` on draft, confirmed, and rejected artifacts, including reconstructed serialized artifacts.

The rule is no longer inferred only from fresh generator output. Empty or whitespace-only protection text is invalid at every artifact boundary.

### 3.4 Local Gotcha prototypes are guarded across generator lifetime

A fresh input realm alone does not change the ECMAScript realm of the callback function. Revision 15 therefore adds one module-level exclusive generator guard.

Before generator invocation, Gotcha captures the complete own-key/descriptor surfaces of local `Object.prototype` and `Array.prototype`. The guard remains held through settlement of a genuine native Promise. In a mandatory finally path, added properties are deleted, original descriptors are restored exactly, and restoration is verified before the guard is released.

If restoration fails, drafting rejects with `TypeError`. Otherwise callback throw/rejection remains authoritative; a successfully returning generator that mutated either guarded surface is rejected with `TypeError` after restoration.

Because generator lifetimes are serialized under this guard, overlapping async generators cannot restore each other's snapshots out of order.

### 3.5 Tree semantics cover the whole protection artifact

Revision 14 guaranteed a tree only for the nested experiment. Revision 15 requires `isTreeGraphV1` over each complete draft/confirmed/rejected artifact before serialization and over the complete parsed artifact after serialization.

Top-level `rule`, `source`, or `protection` containers cannot alias any nested experiment container. Builders must allocate independently owned containers, so direct artifacts and their supported JSON-reloaded forms have the same identity semantics.

## 4. Final authority chain

```text
validated M8 case before callbacks
  -> frozen case eligibility + owned snapshots
  -> retained attack/output snapshots
  -> complete tree experiment
  -> hardened experiment wire probe
  -> emitted replayable experiment
  -> invocation-time source-prototype-preserving capture
  -> owned experimentAuthority
  -> exact callback-realm generator projection
  -> exclusive local prototype guard across generator lifetime
  -> validated generator output
  -> complete tree draft
  -> completed-artifact wire probe
  -> invocation-time confirmation capture
  -> complete tree confirmed/rejected artifact
  -> completed-artifact wire probe
  -> invocation-time verification capture
  -> owned verificationAuthority
  -> baseline replay
  -> exact historical identity gate
  -> improved replay
  -> normalized deterministic result
```

No later phase rereads mutable caller authority. Generator data mutation is isolated by ownership/realm projection; generator local-prototype mutation is detected/restored under the exclusive guard.

## 5. Replayability and artifact boundary

Replayable V1 remains intentionally narrow:

- null/string/boolean;
- finite numbers except `-0`;
- dense local Arrays;
- local ordinary Objects;
- no accessors, symbols, exotic/custom/null/cross-realm prototypes;
- no cycles or repeated identity;
- exact signed-zero-safe attack scores.

The experiment must be a tree and survive its hardened JSON probe. Every protection artifact must independently be a complete tree and survive a final JSON probe after status/text are fixed.

## 6. Public completion and callback model

All public APIs remain genuine-local-Promise-only. Invocation capture occurs before Promise return but executes no callback and exposes no synchronous validation error channel. Capture/validation errors reject asynchronously with `TypeError`.

Generator direct/native-Promise completion semantics remain exact; arbitrary thenables are not assimilated. Generator execution is serialized only for the protected callback lifetime needed to prevent shared local-prototype corruption.

Evaluator failures resolve deterministic semantic verification states according to the total phase/reason mapping.

## 7. Human and historical authority

Drafting returns only `draft`. Confirmation accepts only `draft` and maps:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only a valid confirmed complete-tree artifact.

The baseline evaluator remains a compatibility witness. Historical authority is the bound experiment: per-attack classifications, survivor order, and top finding must match before improved evaluation begins.

## 8. Required proof obligations

Implementation must prove at least:

- custom/null/cross-realm/Proxy/accessor source containers fail invocation capture before copying and cannot be normalized into valid local records;
- immediate caller mutation after API return cannot alter invocation authority;
- generator callback records/arrays expose exact specified callback-realm prototypes, descriptors, length semantics, keys, and extensibility;
- generator input shares no authority data objects or Object/Array prototypes;
- overlapping generator calls are serialized for the full guarded callback/native-Promise lifetime;
- local Object/Array prototype mutation is detected and exactly restored before another generator can run;
- callback throw/rejection survives successful restoration while restoration failure has `TypeError` precedence;
- protection statement/rationale reject empty and whitespace-only values on every artifact status, including reconstructed artifacts;
- aliases anywhere across a completed artifact reject before serialization and cannot be silently de-aliased by JSON;
- every completed artifact revalidates as a whole tree after JSON parse;
- huge/escape-heavy text cannot yield an unserializable returned artifact;
- inherited local `toJSON` never executes during a wire probe;
- signed-zero, severity, ordering, draft-only confirmation, exact evaluator mapping, baseline identity, and complete failure-reason semantics remain intact.

## 9. Scope

Expected implementation files:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

A small internal callback-realm/prototype-guard helper under `src/` is allowed. `src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

Lossless arbitrary graph/prototype serialization, cryptographic attestation, provider adapters, dashboards, model execution, generated evaluator code, automatic patching, and unrelated engine redesign remain out of scope.

## 10. Stopping rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 15 spec.
