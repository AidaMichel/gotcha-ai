# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 16
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit question

What is the smallest deterministic architecture that can turn one confirmed M8 survivor into a human-authorized declarative protection and verify an externally supplied improved evaluator against the exact bound experiment without serialization drift, prototype ambiguity, identity aliasing, callback-global corruption, post-call authority races, confirmation bypass, or implementation-dependent result states?

## 2. Revision 16 principle

Revision 16 removes the source of the Revision 15 loop instead of extending the prototype guard.

The trusted M10 core no longer executes a proposal-generator callback. Model/provider execution is explicitly outside the core; M10 consumes only exact declarative proposal data.

That change eliminates, by construction, the Revision 15 concerns about:

- prototype `[[Prototype]]` / extensibility restoration;
- async global visibility while a generator Promise is pending;
- reentrant generator-guard deadlock;
- callback-projection observable key order;
- cross-realm generator-return records;
- transient prototype mutation detection.

The two remaining generic boundary concerns are handled directly:

- invocation/replay data uses captured intrinsic-brand probes before any normalization, so prototype-rewritten intrinsic exotics cannot masquerade as ordinary authority;
- non-empty-string validation uses captured `String.prototype.trim` through captured `Reflect.apply`, so mutable global trim behavior is irrelevant.

## 3. Why proposal generation moved outside the trusted core

M10's product invariant is that AI proposes declarative protection intent and humans authorize it. The core does not need to own provider execution to enforce that invariant.

The final flow is:

```text
external model/provider adapter
  -> exact declarative proposal value
  -> M10 boundary validation + authority binding
  -> draft artifact
  -> mandatory human confirmation
  -> baseline identity gate
  -> improved evaluator re-attack
```

This is smaller and safer than attempting to make arbitrary JavaScript callback execution transactional across ambient globals for an unbounded async lifetime.

The adapter has no authority over contract/rule/source identity, baseline history, confirmation status, or verification result. It can only propose `{ statement, rationale }` under IDs that M10 independently rebinds to the selected experiment authority.

## 4. Closure of Revision 15 findings

### 4.1 Prototype internal-slot restoration is no longer required

There is no M10 proposal callback and therefore no M10-owned callback lifetime during which the core must snapshot, restore, or compare `Object.prototype` / `Array.prototype` internal state.

Wire operations instead fail closed against one captured prototype baseline: local Object/Array prototype-chain identities must match module-start authority and neither may expose an own `toJSON`.

M10 does not mutate or restore these globals.

### 4.2 No async global prototype exposure window

The removed generator callback means drafting never holds an async callback open while global prototype mutations are visible.

M8 evaluator/attack-generator callback safety remains owned by M8. M10's proposal path is pure data validation/construction.

### 4.3 No reentrant proposal-generation deadlock

`draftContractProtection()` invokes no proposal callback. Recursive/reentrant model execution is outside M10 core and cannot deadlock an M10 global guard because no such guard exists.

### 4.4 No callback projection key-order ambiguity

The generator-input projection was deleted with the generator callback.

For core-created records, Revision 16 separately defines canonical property construction order as the schema order shown in the spec. Caller/reloaded record insertion order is not authority and is normalized by core construction.

### 4.5 Prototype-rewritten exotics are deterministic

Prototype identity alone is not used as an ordinary-object proof.

Before treating a non-array object as V1 schema/data authority, Gotcha runs captured Node intrinsic-brand probes for Date, RegExp, collection types, Promise, native errors, ArrayBuffer/views/typed arrays, boxed primitives, arguments/generator/module-namespace/iterator objects, KeyObject/External values, Buffer, and other available covered intrinsic brands.

A value such as:

```js
Object.setPrototypeOf(new Date(), Object.prototype)
```

still fails because the captured Date brand probe remains positive.

For unbranded host objects not recognized by Node's captured probes, V1 semantics are explicitly the exact current prototype/descriptor data boundary; hidden host semantics are not preserved or authoritative.

### 4.6 Cross-realm generator output ambiguity is gone

There is no generator callback output inside core.

External adapters must pass proposal data through the normal local declarative-data public boundary. Cross-realm/custom-prototype/exotic/Proxy/accessor proposal containers reject rather than being silently normalized after callback return.

### 4.7 Transient mutation detection is gone

Because M10 does not run a proposal callback, it makes no unimplementable claim about detecting every intermediate write to global prototypes.

Wire operations inspect current captured-baseline facts immediately before serialization and fail closed if the baseline is not exact.

### 4.8 Trim semantics are captured

`isNonEmptyStringV1` uses the captured module-start `String.prototype.trim` via captured `Reflect.apply`.

Replacing `String.prototype.trim` later cannot turn whitespace-only task/ID/protection text into valid authority.

## 5. Final authority chain

```text
validated M8 case before callbacks
  -> frozen case eligibility + owned canonical case snapshots
  -> retained attack/output snapshots
  -> complete tree candidate experiment
  -> prototype-baseline + JSON experiment probe
  -> emitted replayable experiment
  -> external adapter obtains declarative proposal
  -> invocation-time descriptor/brand capture
  -> owned experimentAuthority
  -> exact proposal authority binding
  -> complete tree draft
  -> final artifact JSON probe
  -> invocation-time confirmation capture
  -> complete tree confirmed/rejected artifact
  -> final artifact JSON probe
  -> invocation-time verification capture
  -> owned verificationAuthority
  -> baseline replay
  -> exact historical identity gate
  -> improved replay
  -> normalized deterministic result
```

No later phase rereads mutable caller authority. No M10 proposal-generation callback can mutate core authority or ambient prototype state because none is executed.

## 6. Replayability and data boundary

Replayable V1 remains intentionally narrow:

- null/string/boolean;
- finite numbers except `-0`;
- dense local Arrays;
- local Object-prototype data records that pass captured intrinsic-brand rejection;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no cycles or repeated identity;
- exact signed-zero-safe attack scores.

Experiments and protection artifacts are complete trees and must survive the supported JSON round trip without semantic/identity drift.

Prototype-rewritten known intrinsics reject before normalization.

## 7. Public completion model

All three public APIs remain genuine-local-native-Promise-only.

Invocation capture happens synchronously before Promise return but executes no user callback and exposes no synchronous validation-error channel. Capture/schema/authority errors reject asynchronously with `TypeError`.

Drafting has no model callback throw/rejection/thenable channel.

Only evaluator callbacks remain executable in M10, and they are delegated to the existing M8 evaluator execution boundary. Classified evaluator failures resolve deterministic semantic verification states.

## 8. Human and historical authority

Drafting returns only `draft`.

Confirmation accepts only `draft` and maps:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only a valid confirmed complete-tree artifact.

The baseline evaluator is a compatibility witness; the bound experiment remains historical authority. Per-attack classifications, survivor order, and top finding must match before improved evaluation begins.

## 9. Required proof obligations

Implementation must prove at least:

- replacing `String.prototype.trim` cannot alter non-empty-string validation;
- Proxy/accessor/cross-realm/null/custom-prototype containers fail before authority copying;
- prototype-rewritten covered intrinsics (Date/Map/typed arrays/etc.) fail captured brand checks before normalization;
- immediate caller mutation after API return cannot alter experiment/proposal/draft/protection/decision/evaluator authority;
- drafting executes no provider/model/proposal callback;
- proposal data is exact, local, declarative, and rebound to experiment task/source/rule authority;
- accepted experiments and artifacts are whole trees, with aliases/cycles rejected before and after JSON round trip;
- canonical Gotcha-built record key order is stable and independent of caller insertion order;
- prototype-baseline checks include Object/Array prototype-chain identity plus own `toJSON` absence before wire operations;
- empty/whitespace protection text rejects on every artifact boundary;
- huge/escape-heavy proposal/edit text cannot yield an unserializable returned artifact;
- signed-zero, severity, ordering, draft-only confirmation, evaluator-state mapping, baseline identity, and complete failure-reason semantics remain exact.

## 10. Scope

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

## 11. Stopping rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 16 spec.
