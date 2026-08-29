# M12 — Quality Loop Orchestration

Status: Architecture Draft — Revision 3
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

Revision 3 closes the remaining Revision-2 ambiguities:

1. the three M10 delegation function identities are captured exactly once at M12 module initialization and later mutable CommonJS exports are never authoritative;
2. the human-review contract binds both the exact current draft **and the exact submitted decision/edit text** to the human's choice;
3. runtime structural acceptance of a valid reconstructed checkpoint is deterministic and independent of the caller-owned human-reinspection obligation;
4. delegated Promise handling is constrained to the fresh hidden local native Promises returned by the captured same-package M10 functions, eliminating the unsafe arbitrary/unshieldable-Promise branch.

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
- claim that runtime structure validation proves what a human inspected or chose.

The caller still explicitly chooses `sourceAttackId`, supplies declarative `proposal`, obtains the human `decision`, and supplies `evaluator` / `improvedEvaluator`.

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

This stage delegates semantic authority to exactly one immediate call of the captured M10 `draftContractProtection` identity:

```js
draftContractProtection({
  experiment,
  sourceAttackId,
  proposal
})
```

M12 MUST NOT duplicate or weaken M10 experiment, survivor-binding, proposal, wire, tree, or artifact validation.

### 3.2 Complete

After the human has inspected the exact current draft and issued the exact current decision under Section 7:

```js
const result = await completeContractQualityLoop({
  checkpoint,
  decision,
  evaluator,
  improvedEvaluator
});
```

This stage delegates confirmation to exactly one call of the captured M10 `confirmContractProtection` identity.

If confirmation resolves a rejected protection, M12 stops. It MUST NOT call verification and MUST NOT execute either evaluator.

If confirmation resolves a confirmed protection, M12 delegates verification to exactly one call of the captured M10 `verifyContractProtection` identity using the exact evaluator identities captured at M12 invocation.

## 4. Captured authority

At M12 module initialization, before any public invocation, M12 captures the exact references it uses and never performs later authority lookup through mutable globals, prototypes, or CommonJS exports.

Required captured primitives are:

- `util.types.isProxy`;
- the exact forbidden-brand probes in Section 4.1;
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

Required captured M10 entry points are exactly:

```text
draftContractProtection
confirmContractProtection
verifyContractProtection
```

M12 imports/captures those three function identities once during module initialization. Every later delegation uses those captured lexical identities directly. Replacing properties on `require("./contract-remediation")`, `require("gotcha-ai")`, `module.exports`, or any other mutable export object after M12 initialization has zero effect on M12 delegation.

Each captured M10 entry point MUST be a non-Proxy callable function at initialization. If any required primitive, mandatory probe, or M10 entry point is unavailable/non-callable, M12 boundary authority is unavailable for that process and both M12 APIs return their normal local native Promise rejected with the captured local boundary `TypeError` before semantic delegation or evaluator/provider execution.

### 4.1 Exact forbidden-brand set

For M12 public option/checkpoint record classification, the mandatory forbidden-brand probes are the same V1 set locked by M10 Section 2.4:

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

This duplicate list is only a boundary-shape compatibility rule. It does not make M12 authoritative for M10 remediation semantics.

## 5. Public invocation authority

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

M12-generated boundary failures reject the returned Promise with a captured local `TypeError`; they do not execute provider/model/evaluator code.

### 5.1 Exact prepare options

Exactly:

```js
{
  experiment,
  sourceAttackId,
  proposal
}
```

M12 captures the three descriptor values synchronously and immediately invokes the captured M10 draft function with a fresh exact ordinary options record before returning control to caller code.

M10 then performs its existing synchronous invocation capture, so later caller mutation cannot change experiment/proposal/source authority.

M12 does not separately deep-clone or semantically validate those three values before M10. M10 is the semantic authority.

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

After exact checkpoint-wrapper validation, M12 immediately invokes the captured M10 confirmation function with the captured checkpoint draft and captured decision before returning control to caller code. M10 therefore owns draft/decision validation and captures both before caller mutation can change them.

Evaluator callback identities are retained only for a later confirmed verification step and are never invoked by M12 directly.

## 6. Checkpoint artifact and structural acceptance

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

`draft` is exactly the successful `status: "draft"` M10 artifact returned by the captured M10 draft call. M12 does not modify its fields or create competing remediation semantics.

### 6.1 Exact completion-time checkpoint-wrapper predicate

A checkpoint wrapper accepted structurally by `completeContractQualityLoop()` passes only when all are true:

1. value is a non-null object and captured `Array.isArray(value) === false`;
2. captured Proxy probe is false;
3. every Section-4.1 forbidden-brand probe is false;
4. captured prototype is exactly local `Object.prototype` **or** `null`;
5. captured `Object.isExtensible(value) === true`;
6. captured `Reflect.ownKeys(value)` is exactly, in this order:

```text
["version", "kind", "state", "draft"]
```

7. each property is an own data property exactly writable/enumerable/configurable `true`;
8. there are no symbols, extras, omissions, accessors, non-enumerable fields, or alternate descriptors;
9. descriptor values satisfy `version === 1`, `kind === "contract-quality-loop-checkpoint"`, `state === "awaiting-confirmation"`;
10. only after 1–9 pass may M12 obtain the `draft` descriptor value and delegate it to M10.

Frozen/sealed/non-extensible wrappers, wrappers with non-ordinary descriptors, arrays, Proxies, covered runtime brands whose prototypes were rewritten, and custom/cross-realm prototype objects reject deterministically before M10 confirmation.

A normal `JSON.parse()` reconstruction has local `Object.prototype`, ordinary mutable descriptors, and extensibility. Therefore if its values also satisfy 1–10, **runtime structural acceptance is unconditional**. Runtime does not and cannot branch on whether a human reinspection occurred.

M12 MUST NOT infer nested draft validity from the wrapper. The captured `draft` value is passed to the captured M10 confirmation function, which independently revalidates and captures the entire draft under M10.

## 7. Human-review and decision-authority contract

This section is a caller/UI workflow contract, not a runtime-detectable structural predicate.

M12 does not provide cryptographic provenance, signatures, trusted durable storage, or proof of human perception. Therefore runtime acceptance in Section 6 is intentionally separate from the human-authority obligation here.

### 7.1 Exact reviewed draft

Before completion, the human MUST inspect the exact current `checkpoint.draft` that will be supplied to `completeContractQualityLoop()`.

If that draft is mutated, serialized/reconstructed, crosses mutable/untrusted storage, or otherwise loses trusted continuity after inspection, the previous inspection/decision is stale. The exact current draft MUST be re-presented and a fresh decision obtained.

Changing `draft.protection.statement`, `draft.protection.rationale`, or any other structurally valid field is included. M10 structural validity is not provenance proof.

### 7.2 Exact human-issued decision

The exact `decision` value submitted to completion MUST be the exact decision the human issued for the exact current draft under Section 7.1.

For `accept` and `reject`, the human-issued `type` is authority.

For `edit`, both the human-issued `type: "edit"` and the exact human-issued `statement` string are authority.

If the decision record or any decision field is mutated, replaced, serialized/reconstructed, crosses mutable/untrusted storage, or otherwise loses trusted continuity after the human issued it, that earlier human authority is stale. The current draft MUST be presented again and a fresh exact decision obtained before completion.

Examples that invalidate an earlier choice include:

```text
human chose reject -> record mutated to accept
human chose accept -> record replaced with edit
human chose edit("A") -> statement changed to "B"
human decision serialized/reloaded through mutable storage
```

Supplying `decision` to completion semantically asserts both Section 7.1 and 7.2 for the exact descriptor values captured by that invocation.

M12 does not claim to detect a caller that lies about this assertion. Runtime structure validation cannot prove human perception or intent.

## 8. Exact completion ordering

For a structurally valid completion invocation, ordering is normative:

1. capture/validate exact M12 outer options;
2. validate/capture exact checkpoint wrapper under Section 6.1;
3. capture evaluator identities;
4. treat Sections 7.1–7.2 as caller-owned workflow preconditions, not runtime predicates;
5. invoke the captured M10 confirmation function exactly once with `{ draft, decision }`;
6. observe that hidden delegated M10 Promise only through Section 9;
7. if the protection is rejected, build the M12 rejected result and stop;
8. if the protection is confirmed, invoke the captured M10 verification function exactly once with `{ protection, evaluator, improvedEvaluator }`;
9. observe that hidden delegated M10 Promise only through Section 9;
10. build the M12 completed result without rewriting the verification payload.

No evaluator is called before M10 verification itself reaches its existing evaluator gates.

No M12 retry/fallback occurs on any throw/rejection/failure state.

## 9. Same-package delegated Promise invariant and species-safe observation

M12 does not accept arbitrary caller-supplied Promise/thenable values at this seam.

The only delegated Promises are the direct, synchronous return values of the three captured same-package M10 functions from Section 4. Those M10 APIs already contractually return genuine local native Promises. In the current package they create fresh local Promise instances and do not expose those instances to caller code before M12 immediately begins observation.

Revision 3 therefore locks one **package integration invariant** for M12-compatible M10 entry points:

```text
delegated Promise is a fresh extensible local native Promise
current prototype === captured local Promise.prototype
own "constructor" descriptor === absent
```

This is not a public input classification rule. M12 does not support substituted M10 functions, arbitrary returned thenables, caller-mutated delegated Promises, or an "unshieldable delegated Promise" fallback. Such a branch is intentionally absent because safely consuming an already-rejected Promise whose own non-configurable constructor prevents species shielding is not generally possible without invoking potentially hostile species authority.

The captured M10 function identities and synchronous hidden handoff eliminate caller interleaving between M10 Promise creation and M12 shielding. Package tests MUST prove the integration invariant for all three captured M10 entry points. If a future M10 revision changes this invariant, M12 architecture must be revised before that combination is released.

### 9.1 Exact observation algorithm

At M12 module initialization, create one trusted `safePromiseSpeciesContainer` with an own `Symbol.species` data property whose value is the captured local `Promise` constructor and whose descriptor is non-writable, non-enumerable, non-configurable.

For each hidden delegated M10 Promise, M12 performs exactly:

1. capture its own `constructor` descriptor without property access and require the package integration invariant: descriptor is absent, object is extensible, current prototype is captured local `Promise.prototype`, and the captured Promise brand check succeeds;
2. install a temporary own `constructor` data property with value `safePromiseSpeciesContainer`, writable `true`, enumerable `false`, configurable `true`;
3. invoke captured `Promise.prototype.then` exactly once via captured `Reflect.apply`, passing M12 fulfillment/rejection reactions;
4. synchronously delete the temporary own `constructor` property;
5. require deletion success before considering observation established.

The Promise returned by the captured `then` call is internal only and is never exposed as M12 semantic authority.

Because the only conforming delegated inputs satisfy the package integration invariant, there is no conforming path in which step 2 is blocked by a pre-existing non-configurable own `constructor`.

### 9.2 Observation setup failure

Failure to satisfy the package integration invariant or failure of shield installation/observation/restoration is an **internal package compatibility defect**, not a supported hostile-public-input branch.

M12 implementations MUST NOT add a regression test that fabricates or monkey-patches an unshieldable delegated Promise and then claim ordinary M12 boundary semantics for it. The public caller has no reference to the hidden delegated Promise at that point, and mutable CommonJS M10 replacement is already excluded by Section 4.

The release compatibility gate is instead: all three exact captured M10 functions, in the same package build, must pass the hidden fresh-Promise invariant and species-safe observation tests. A package build that fails that gate is not M12-compatible and must not be released as conforming M12.

### 9.3 Delegated rejection identity

After observation is successfully established, if captured M10 draft/confirmation/verification rejects, that exact rejection reason becomes the M12 public rejection reason with object/value identity preserved.

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

M12 MUST use only the three captured public M10 entry-point identities. It MUST NOT reach into `contract-remediation.js` private validators/builders/replay helpers or duplicate their semantics.

Authoritative ownership remains:

- M8: confirmed-contract attack generation, execution, ranking, replayable experiment emission;
- M10 draft: experiment/source/proposal binding;
- M10 confirm: accept/edit/reject semantics;
- M10 verify: baseline identity, improved replay, regression/source-caught semantics;
- M11: provider-neutral generation transport boundary only;
- M12: sequencing, wrapper validation, Promise-safe same-package delegation, and explicit workflow state only.

M12 must not modify M8/M10/M11 result semantics to make orchestration easier.

## 13. Proof matrix

### 13.1 Deterministic runtime proofs

Implementation is not complete until tests prove at least:

- exact prepare options reject omissions/extras/symbols/accessors/Proxies/non-local prototypes/non-ordinary descriptors/sealed/frozen/non-extensible wrappers;
- exact complete options reject the same malformed outer surfaces;
- Section-4.1 covered runtime brands still reject after prototype rewriting;
- missing mandatory captured primitive/probe fails closed before semantic delegation;
- the three M10 entry-point identities are captured at module initialization and later export replacement does not change M12 delegation;
- each captured M10 entry point is called exactly once on the path that requires it;
- prepare performs zero provider/model/evaluator calls;
- caller mutation after prepare invocation cannot alter experiment/source/proposal authority observed by M10;
- successful checkpoint has exact canonical key order/literals/descriptors, is extensible, and has null prototype;
- a structurally valid normal JSON reconstruction of the checkpoint wrapper is accepted unconditionally by the Section-6.1 runtime predicate;
- checkpoint wrapper predicate rejects frozen/sealed/non-extensible wrappers, non-enumerable/non-writable/non-configurable fields, symbols/extras/accessors, arrays, Proxies, custom/cross-realm prototypes, and prototype-rewritten covered brands;
- valid wrapper with malformed nested draft still rejects through M10 confirmation rather than bypassing it;
- caller mutation after complete invocation cannot alter captured decision/draft authority before M10 synchronous capture;
- evaluator and improved-evaluator identities are captured before asynchronous confirmation settles;
- reject decision yields exact M12 rejected result, zero verify calls, and zero evaluator calls;
- accept decision invokes M10 verification exactly once;
- edit decision invokes M10 verification exactly once with the M10 edited confirmed protection;
- M10 verification semantic state is mirrored exactly in `result.state` and `result.verification` is not rewritten;
- all three captured M10 entry points return hidden fresh extensible local native Promises with absent own `constructor` descriptor as required by Section 9;
- species-safe observation executes hostile inherited `Promise.prototype.constructor` / `Symbol.species` hooks zero times for all three delegated M10 stages;
- no arbitrary/unshieldable delegated-Promise test seam exists;
- after successful observation setup, M10 draft/confirmation/verification rejection reasons propagate with exact identity;
- checkpoint and completion result roots are null-prototype and inherited `Object.prototype.then` executes zero times on fulfillment;
- M12 never invokes `runContractAttacks()`, a provider adapter, or a model callback;
- existing M8/M10/M11 tests remain unchanged and passing;
- package remains dependency-free;
- packed artifact exposes both M12 APIs to an isolated consumer.

### 13.2 Workflow-contract/documentation obligations

These obligations are normative for callers/UIs but are **not** runtime-detectable and MUST NOT be written as tests that condition structural acceptance on unverifiable human history:

- the human inspects the exact current draft before deciding;
- any draft mutation/reconstruction/untrusted-storage crossing after inspection requires reinspection and a fresh decision;
- the exact submitted decision is the exact human-issued choice;
- any decision mutation/reconstruction/untrusted-storage crossing after issuance requires a fresh decision;
- for `edit`, the submitted statement is exactly the human-issued edit statement.

A documentation/integration example MAY demonstrate these obligations, but identical runtime input values must receive identical structural acceptance regardless of unverifiable prior human history.

## 14. First implementation slice

Slice A remains intentionally narrow:

```text
prepareContractQualityLoop()
  -> exact outer capture
  -> captured M10 draft delegation
  -> species-safe hidden-Promise observation
  -> awaiting-confirmation checkpoint

completeContractQualityLoop()
  -> exact outer/checkpoint capture
  -> caller-owned exact-current-draft + exact-decision human contract
  -> captured M10 confirmation delegation
  -> species-safe hidden-Promise observation
  -> reject stop OR captured M10 verification
  -> species-safe hidden-Promise observation
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
- runtime proof of human perception/choice history;
- multi-run history or collaboration;
- GitHub Actions integration;
- retries/failover/background execution;
- new verification scoring or ranking semantics.

## 16. Stopping rule

Runtime implementation MUST NOT begin until this architecture receives a clean exact-head Codex review.

Any ambiguity that could change human-confirmation timing, exact-decision authority, M10 function-identity authority, callback timing, delegated rejection identity, same-package Promise species safety, checkpoint descriptor/brand acceptance, structural reconstruction behavior, or result semantics must be resolved in this document before runtime code is added.
