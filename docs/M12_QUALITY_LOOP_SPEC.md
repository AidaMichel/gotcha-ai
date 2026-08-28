# M12 — Quality Loop Orchestration

Status: Architecture Draft — Revision 2
Milestone: 12
Branch: `milestone-12-quality-loop`
Base: `main@88c066bbba8a98c331e676aeb6788d9126a55ddf`

## 1. Goal

M12 closes the current public workflow gap between a replayable confirmed-contract finding and M10 remediation without weakening any existing authority boundary.

The current public path is manually stitched by callers:

```text
runContractAttacks()
  -> draftContractProtection()
  -> human decision
  -> confirmContractProtection()
  -> verifyContractProtection()
```

M12 adds a small orchestration layer around the existing M10 APIs so the product exposes an explicit quality-loop checkpoint before human confirmation and one completion call after that confirmation decision.

M12 does **not** redefine attack generation, proposal semantics, confirmation semantics, replay, or verification. M8 and M10 remain authoritative.

Revision 2 additionally fixes three architecture requirements:

1. delegated M10 Promises are observed only through an exact species-safe shield/observe/restore algorithm;
2. a human decision is explicitly authoritative only for the exact current draft inspected by that human, with trusted-continuity/reinspection rules for reconstructed checkpoints;
3. accepted checkpoint wrappers have one exact descriptor/extensibility/brand surface.

## 2. Product rule

The convenience layer MUST preserve the visible human boundary:

```text
GOTCHA
  ↓
DRAFT PROTECTION
  ↓
AWAIT HUMAN CONFIRMATION
  ↓
CONFIRM / REJECT
  ↓
VERIFY / RE-ATTACK
```

M12 MUST NOT:

- silently choose a survivor;
- generate a protection proposal;
- auto-accept or auto-edit a draft;
- generate or patch executable evaluator code;
- invoke a provider/model;
- retry M10 operations;
- reinterpret M10 verification states;
- treat a non-replayable M8 experiment as remediable;
- claim that a human inspected a draft when the caller has not satisfied Section 6.

The caller still explicitly chooses `sourceAttackId`, supplies declarative `proposal`, supplies the human `decision`, and supplies `evaluator` / `improvedEvaluator`.

## 3. Public API

M12 adds exactly two public functions:

```js
const {
  prepareContractQualityLoop,
  completeContractQualityLoop
} = require("gotcha-ai");
```

The prior APIs remain unchanged.

### 3.1 Prepare

```js
const checkpoint = await prepareContractQualityLoop({
  experiment,
  sourceAttackId,
  proposal
});
```

This stage delegates semantic authority to exactly one immediate call of:

```js
draftContractProtection({
  experiment,
  sourceAttackId,
  proposal
})
```

M12 MUST NOT duplicate or weaken M10 experiment, survivor-binding, proposal, wire, tree, or artifact validation.

### 3.2 Complete

After the human has inspected the exact current `checkpoint.draft` under Section 6:

```js
const result = await completeContractQualityLoop({
  checkpoint,
  decision,
  evaluator,
  improvedEvaluator
});
```

Supplying `decision` is a caller assertion that the Section-6 inspection precondition is true for the exact draft descriptor value captured by this completion invocation.

This stage delegates confirmation to exactly one call of `confirmContractProtection()`.

If that call resolves a rejected protection, M12 stops. It MUST NOT call `verifyContractProtection()` and MUST NOT execute either evaluator.

If it resolves a confirmed protection, M12 delegates verification to exactly one call of `verifyContractProtection()` using the exact evaluator identities captured at M12 invocation.

## 4. Captured authority and primitive safety

At module initialization M12 captures the exact references it needs and never treats later mutable globals/prototypes as authority:

- `util.types.isProxy`;
- `util.types.isPromise`;
- the exact forbidden-brand probes listed in Section 4.1;
- `Buffer.isBuffer`;
- `Object.getOwnPropertyDescriptors`;
- `Object.getOwnPropertyDescriptor`;
- `Object.getPrototypeOf`;
- `Object.isExtensible`;
- `Object.defineProperty`;
- `Reflect.ownKeys`;
- `Reflect.apply`;
- `Reflect.deleteProperty`;
- `Array.isArray`;
- local `Object.prototype`;
- local `Promise` constructor;
- local `Promise.prototype`;
- local `Promise.prototype.then`;
- `Symbol.species`;
- local `TypeError` constructor.

If a required captured primitive or mandatory probe is unavailable/non-callable at module initialization, M12 boundary authority is unavailable for that process and both M12 APIs return their normal local native Promise rejected with the captured local boundary `TypeError` before semantic delegation/callback execution.

### 4.1 Exact forbidden-brand set

For M12 public option/checkpoint record classification, the exact mandatory forbidden-brand probes are the same V1 set already locked by M10 Section 2.4:

```text
util.types.isDate
util.types.isRegExp
util.types.isMap
util.types.isSet
util.types.isWeakMap
util.types.isWeakSet
util.types.isPromise
util.types.isNativeError
util.types.isAnyArrayBuffer
util.types.isDataView
util.types.isTypedArray
util.types.isBoxedPrimitive
util.types.isArgumentsObject
util.types.isGeneratorObject
util.types.isModuleNamespaceObject
util.types.isMapIterator
util.types.isSetIterator
util.types.isExternal
Buffer.isBuffer
```

`isProxy` is checked before these probes. Any positive probe rejects. Brand probing occurs before prototype acceptance, so a covered intrinsic whose prototype was rewritten to `Object.prototype` or `null` still rejects.

This duplicate list is a boundary-shape compatibility rule only; it does not make M12 authoritative for M10 remediation semantics.

## 5. Invocation authority

Both M12 functions are ordinary functions; there is no constructor, class, session object, background worker, persistence layer, or workflow registry.

Both public functions always return a genuine local native Promise.

Each top-level options record MUST be an exact ordinary local record:

- non-null object and not an Array;
- non-Proxy;
- no Section-4.1 forbidden brand;
- prototype exactly local `Object.prototype`;
- extensible;
- exact required own string-keyed properties only;
- every required property is an own data property exactly writable/enumerable/configurable `true`;
- no extras, symbols, accessors, inherited option authority, non-enumerable fields, alternate descriptors, sealed/frozen/non-extensible wrappers, or custom/cross-realm prototypes.

Validation uses captured descriptors before semantic reads.

Boundary failures reject the returned Promise with a captured local `TypeError`; they do not execute provider/model/evaluator code.

### 5.1 Exact prepare options

Exactly:

```js
{
  experiment,
  sourceAttackId,
  proposal
}
```

M12 captures the three descriptor values synchronously and immediately invokes `draftContractProtection()` with a fresh exact ordinary options record before returning control to caller code.

M10 then performs its existing synchronous invocation capture, so later caller mutation cannot change experiment/proposal/source authority.

M12 does not separately deep-clone or semantically validate those three values before M10. M10 is the one semantic authority.

### 5.2 Exact complete options

Exactly:

```js
{
  checkpoint,
  decision,
  evaluator,
  improvedEvaluator
}
```

M12 captures all four descriptor values synchronously.

`evaluator` and `improvedEvaluator` MUST each satisfy the existing M10 accepted-evaluator rule: function identity and non-Proxy. No additional function-kind/realm restriction is added by M12.

After exact checkpoint-wrapper validation, M12 immediately invokes `confirmContractProtection()` with the checkpoint draft and captured decision before returning control to caller code. M10 therefore owns draft/decision validation and captures both before caller mutation can change them.

Evaluator callback identities are retained only for a later confirmed verification step and are never invoked by M12 directly.

## 6. Human-review continuity and reconstructed checkpoints

This section is normative.

M12 does not provide cryptographic provenance, signatures, durable trusted storage, or proof that a human viewed a particular byte sequence. Therefore the human-confirmation guarantee is defined honestly as a workflow precondition owned by the caller/UI.

### 6.1 Live trusted checkpoint

For a checkpoint that remains in caller-trusted memory from `prepareContractQualityLoop()` until the decision is obtained:

- the human MUST inspect the exact current `checkpoint.draft` that will be supplied to completion;
- the `decision` MUST be obtained after that inspection;
- mutation of the draft after inspection invalidates that decision and requires a fresh inspection/decision.

### 6.2 JSON reconstruction or mutable/untrusted storage

A JSON-reconstructed checkpoint may be structurally accepted by M12, but reconstruction is **not** evidence that it is the draft the human previously reviewed.

If a checkpoint has been serialized, reconstructed, crossed mutable/untrusted storage, or otherwise lost trusted continuity, the caller MUST:

1. treat any earlier human decision as stale;
2. re-present the exact current reconstructed `checkpoint.draft` to the human;
3. obtain a fresh decision only after that reinspection;
4. call `completeContractQualityLoop()` with that fresh decision and current checkpoint.

An `accept`, `edit`, or `reject` decision made against an earlier pre-storage/pre-mutation draft MUST NOT be reused.

If the caller cannot guarantee either trusted continuity under Section 6.1 or fresh reinspection under Section 6.2, it MUST NOT invoke completion.

Supplying `decision` to `completeContractQualityLoop()` semantically asserts that one of these two conditions has been satisfied for the exact current draft descriptor value captured by that invocation.

M12 does not claim to detect a caller that violates this precondition. This is the same kind of caller-owned human/UI authority boundary as choosing the decision itself; runtime structure validation cannot prove human perception.

In particular, changing `draft.protection.rationale` or any other structurally valid draft field in storage requires reinspection even when M10 would otherwise accept the reconstructed draft structurally. M10's structural validation is not provenance proof.

## 7. Checkpoint artifact and exact accepted wrapper surface

Successful prepare resolves exactly:

```js
{
  version: 1,
  kind: "contract-quality-loop-checkpoint",
  state: "awaiting-confirmation",
  draft
}
```

The public checkpoint root is a fresh null-prototype record so native Promise fulfillment cannot assimilate an inherited `Object.prototype.then` hook.

The four properties are created in exactly the canonical order shown above and are own data properties exactly writable/enumerable/configurable `true`. The checkpoint root remains extensible.

`draft` is exactly the successful `status: "draft"` M10 artifact returned by `draftContractProtection()` for this preparation attempt. M12 does not modify its fields or create competing remediation semantics.

### 7.1 Exact completion-time wrapper predicate

A checkpoint wrapper accepted by `completeContractQualityLoop()` passes only when all are true:

1. value is a non-null object and captured `Array.isArray(value) === false`;
2. captured Proxy probe is false;
3. every Section-4.1 forbidden-brand probe is false;
4. captured prototype is exactly local `Object.prototype` **or** `null`;
5. captured `Object.isExtensible(value) === true`;
6. captured `Reflect.ownKeys(value)` is exactly, in this order:

```text
["version", "kind", "state", "draft"]
```

7. each of the four properties is an own data property exactly `{ writable: true, enumerable: true, configurable: true }`;
8. there are no symbols, extras, omissions, accessors, non-enumerable fields, or alternate descriptors;
9. descriptor values satisfy `version === 1`, `kind === "contract-quality-loop-checkpoint"`, `state === "awaiting-confirmation"`;
10. only after 1–9 pass may M12 obtain the `draft` descriptor value and delegate it to M10.

Thus frozen/sealed/non-extensible wrappers, wrappers with non-ordinary descriptors, arrays, Proxies, covered runtime brands whose prototypes were rewritten, and custom/cross-realm prototype objects reject deterministically before M10 confirmation.

A normal `JSON.parse()` reconstruction has local `Object.prototype`, ordinary mutable descriptors, and extensibility, so it may satisfy this wrapper predicate. Section 6 still requires fresh human reinspection after reconstruction.

M12 MUST NOT infer nested draft validity from the wrapper. The captured `draft` value is passed to `confirmContractProtection()`, which independently revalidates and captures the entire draft under M10.

## 8. Exact completion ordering

For a valid completion invocation, ordering is normative:

1. capture/validate exact M12 outer options;
2. validate/capture exact checkpoint wrapper under Section 7.1;
3. capture evaluator identities;
4. require the caller-owned Section-6 human-review precondition by API contract;
5. call `confirmContractProtection({ draft, decision })` exactly once;
6. observe that delegated M10 Promise only through Section 9;
7. if the protection is rejected, build the M12 rejected result and stop;
8. if the protection is confirmed, call `verifyContractProtection({ protection, evaluator, improvedEvaluator })` exactly once;
9. observe that delegated M10 Promise only through Section 9;
10. build the M12 completed result without rewriting the verification payload.

No evaluator is called before M10 verification itself reaches its existing evaluator gates.

No M12 retry/fallback occurs on any throw/rejection/failure state.

## 9. Species-safe delegated Promise observation

M12 MUST NOT observe delegated M10 Promises with ambient `await`, ambient `Promise.resolve`, or a bare captured `Promise.prototype.then` call without species shielding.

M12 delegates only to package-owned M10 APIs, which contractually return genuine local native Promises. Even so, `Promise.prototype.constructor` / `Symbol.species` may have been poisoned before an M12 invocation, so observation uses the following exact algorithm.

At module initialization M12 creates one trusted `safePromiseSpeciesContainer` with an own `Symbol.species` data property whose value is the captured local `Promise` constructor and whose descriptor is non-writable, non-enumerable, non-configurable.

For each delegated Promise `promise`:

1. reject with M12 boundary `TypeError` unless captured `isProxy(promise) === false`, captured `isPromise(promise) === true`, and captured `getPrototypeOf(promise) === captured Promise.prototype`;
2. capture the own `constructor` descriptor without property access;
3. require that descriptor either be absent on an extensible Promise or be configurable; a non-configurable own constructor property rejects before observation;
4. install a temporary own `constructor` data property with value `safePromiseSpeciesContainer`, writable `true`, enumerable `false`, configurable `true`;
5. invoke captured `Promise.prototype.then` exactly once via captured `Reflect.apply`, passing M12 fulfillment/rejection reactions;
6. in a synchronous `finally`, restore the exact prior configurable descriptor, or delete the temporary own property when there was no prior descriptor;
7. only after shielding, `then` registration, and restoration all succeed is delegated observation considered established.

The returned Promise from the captured `then` call is not semantic authority and need not be exposed.

### 9.1 Shield/setup/restoration failure precedence

If classification, shield installation, the captured `then` call, or restoration/deletion fails, M12 rejects its public Promise with a captured local M12 boundary `TypeError`.

If reactions were registered before a later synchronous restoration failure, those reactions are logically cancelled for public settlement: they MUST check an internal observation-active flag and MUST NOT later settle or overwrite the already chosen M12 boundary failure.

Therefore exact delegated rejection-identity propagation applies **only after** the complete shield/observe/restore setup in Section 9 succeeds.

### 9.2 Delegated rejection identity

After successful observation setup, if `draftContractProtection()`, `confirmContractProtection()`, or `verifyContractProtection()` rejects, that exact rejection reason becomes the M12 public rejection reason with object/value identity preserved.

M12 MUST NOT inspect, clone, stringify, normalize, wrap, or replace that delegated reason merely to propagate it.

Semantic M10 verification failures that resolve a verification result remain resolved results; M12 MUST NOT convert them into Promise rejection.

## 10. Completion result

### 10.1 Rejected by human

If M10 confirmation resolves `status: "rejected"`, M12 resolves exactly:

```js
{
  version: 1,
  kind: "contract-quality-loop-result",
  state: "rejected",
  protection,
  verification: null
}
```

`protection` is exactly the M10 rejected artifact returned for this completion attempt.

Verification call count is zero. Evaluator call count is zero.

### 10.2 Confirmed and verified/replayed

If M10 confirmation resolves `status: "confirmed"`, M12 runs M10 verification and resolves exactly:

```js
{
  version: 1,
  kind: "contract-quality-loop-result",
  state: verification.state,
  protection,
  verification
}
```

M12 does not invent a second success boolean or remap states.

`verification` is exactly the M10 verification result from this run, including partial semantic states such as baseline mismatch/execution failure and complete states such as `verified`, `regression-detected`, or `source-finding-still-survives`.

The M12 result root is a fresh null-prototype extensible record with exactly the five properties shown, in canonical order, each an own data property exactly writable/enumerable/configurable `true`.

The nested M10 protection and verification objects remain M10-produced artifacts/results; M12 does not mutate them.

## 11. Safe public fulfillment roots

Both M12 public success roots — checkpoint and completion result — are fresh null-prototype records.

They contain no own executable `then` property. Native Promise resolution therefore cannot discover an inherited `Object.prototype.then` or custom prototype `then` hook on the public fulfillment root.

Required regression tests poison inherited `Object.prototype.then` before fulfillment and prove it executes zero times for both M12 success APIs.

Nested M10 values are data fields inside the already-safe root and are not themselves used as the M12 public Promise fulfillment root.

## 12. No new semantic authority

M12 MUST use the existing public M10 APIs, not reach into `contract-remediation.js` internals to reimplement private validators/builders/replay logic.

Authoritative ownership remains:

- M8: confirmed-contract attack generation, execution, ranking, replayable experiment emission;
- M10 draft: experiment/source/proposal binding;
- M10 confirm: accept/edit/reject semantics;
- M10 verify: baseline identity, improved replay, regression/source-caught semantics;
- M11: provider-neutral generation transport boundary only;
- M12: sequencing, wrapper validation, Promise-safe delegation, and explicit workflow state only.

M12 must not modify M8/M10/M11 result semantics to make orchestration easier.

## 13. Required proof matrix

Implementation is not complete until deterministic tests prove at least:

- exact prepare options reject omissions/extras/symbols/accessors/Proxies/non-local prototypes/non-ordinary descriptors/sealed/frozen/non-extensible wrappers;
- exact complete options reject the same malformed outer surfaces;
- Section-4.1 covered runtime brands still reject after prototype rewriting;
- missing mandatory captured primitive/probe fails closed before semantic delegation;
- prepare immediately delegates exactly once to M10 draft and performs zero provider/model/evaluator calls;
- caller mutation after prepare invocation cannot alter experiment/source/proposal authority observed by M10;
- successful checkpoint has exact canonical key order/literals/descriptors, is extensible, and has null prototype;
- checkpoint JSON reconstruction produces an accepted ordinary wrapper **only when** the caller follows the normative fresh-reinspection requirement; earlier pre-reconstruction decisions are explicitly out of contract;
- exact checkpoint wrapper predicate rejects frozen/sealed/non-extensible wrappers, non-enumerable/non-writable/non-configurable fields, symbols/extras/accessors, arrays, Proxies, custom/cross-realm prototypes, and prototype-rewritten covered brands;
- valid wrapper with malformed nested draft still rejects through M10 confirmation rather than bypassing it;
- complete immediately delegates exactly once to M10 confirmation;
- caller mutation after complete invocation cannot alter captured decision/draft authority before M10 capture;
- evaluator and improved-evaluator identities are captured before asynchronous confirmation settles;
- reject decision yields exact M12 rejected result, zero verify calls, and zero evaluator calls;
- accept decision invokes M10 verification exactly once;
- edit decision invokes M10 verification exactly once with the M10 edited confirmed protection;
- M10 verification semantic state is mirrored exactly in `result.state` and `result.verification` is not rewritten;
- delegated Promise observation executes hostile inherited `Promise.prototype.constructor` / `Symbol.species` hooks zero times;
- delegated Promise with unshieldable own non-configurable constructor rejects before observation;
- shield installation/restoration failure yields M12 boundary `TypeError` and later registered reactions cannot overwrite that failure;
- after successful observation setup, M10 draft/confirmation/verification Promise rejection reasons propagate with exact identity;
- checkpoint and completion result roots are null-prototype and inherited `Object.prototype.then` executes zero times on fulfillment;
- M12 never invokes `runContractAttacks()`, a provider adapter, or a model callback;
- existing M8/M10/M11 tests remain unchanged and passing;
- package remains dependency-free;
- packed artifact exposes both M12 APIs to an isolated consumer.

## 14. First implementation slice

Slice A is intentionally narrow:

```text
prepareContractQualityLoop()
  -> exact outer capture
  -> immediate M10 draft delegation
  -> species-safe observation
  -> awaiting-confirmation checkpoint

completeContractQualityLoop()
  -> exact outer/checkpoint capture
  -> caller-owned exact-current-draft human-review precondition
  -> immediate M10 confirmation delegation
  -> species-safe observation
  -> reject stop OR confirmed M10 verification
  -> species-safe observation
  -> exact workflow result
```

Expected implementation touches:

```text
src/contract-quality-loop.js
src/index.js
test/contract-quality-loop.test.js
README.md
```

M8/M10/M11 core files remain unchanged by default. A change to them requires a concrete compatibility defect discovered during implementation and separate review justification.

## 15. Out of scope

M12 Slice A does not add:

- provider-specific SDK helpers;
- hosted provider execution;
- automatic survivor selection;
- proposal generation;
- AI-generated evaluator code;
- automatic code patching;
- an interactive terminal/UI confirmation prompt;
- durable trusted persistence or provenance;
- cryptographic signatures/attestation of human review;
- multi-run history or collaboration;
- GitHub Actions integration;
- retries/failover/background execution;
- new verification scoring or ranking semantics.

## 16. Stopping rule

Runtime implementation MUST NOT begin until this architecture receives a clean exact-head Codex review.

Any ambiguity that could change human-confirmation timing, trusted-continuity/reinspection responsibility, M10 authority, callback timing, rejection identity, Promise species safety, checkpoint descriptor/brand acceptance, checkpoint reconstruction, or result semantics must be resolved in this document before runtime code is added.
