# M12 — Quality Loop Orchestration

Status: Architecture Draft — Revision 1
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
- treat a non-replayable M8 experiment as remediable.

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

After the human has inspected the returned draft:

```js
const result = await completeContractQualityLoop({
  checkpoint,
  decision,
  evaluator,
  improvedEvaluator
});
```

This stage delegates confirmation to exactly one call of `confirmContractProtection()`.

If that call resolves a rejected protection, M12 stops. It MUST NOT call `verifyContractProtection()` and MUST NOT execute either evaluator.

If it resolves a confirmed protection, M12 delegates verification to exactly one call of `verifyContractProtection()` using the exact evaluator identities captured at M12 invocation.

## 4. Construction and invocation authority

Both M12 functions are ordinary functions; there is no constructor, class, session object, hidden mutable singleton, background worker, or global workflow registry.

Both public functions always return a genuine local native Promise.

Each top-level options record MUST be:

- non-Proxy;
- local plain record with prototype exactly local `Object.prototype`;
- extensible;
- exact required own string-keyed enumerable writable configurable data properties;
- no extras, symbols, accessors, inherited option authority, or alternate descriptors.

Validation uses captured intrinsics before semantic reads.

Boundary failures reject the returned Promise with a captured local `TypeError`; they do not execute provider/model/evaluator code.

### 4.1 Exact prepare options

Exactly:

```js
{
  experiment,
  sourceAttackId,
  proposal
}
```

M12 captures the three descriptor values synchronously and immediately invokes `draftContractProtection()` with a fresh exact ordinary options record before returning control to caller code.

This is intentional: M10 then performs its existing synchronous invocation capture, so later caller mutation cannot change experiment/proposal/source authority.

M12 does not separately deep-clone or semantically validate those three values before M10. M10 is the one semantic authority.

### 4.2 Exact complete options

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

`evaluator` and `improvedEvaluator` MUST each satisfy the existing M10 accepted-evaluator rule: primitive function identity and non-Proxy. No additional function-kind/realm restriction is added by M12.

After checkpoint outer validation, M12 immediately invokes `confirmContractProtection()` with the checkpoint draft and the captured decision before returning control to caller code. M10 therefore owns draft/decision validation and captures both before caller mutation can change them.

Evaluator callback identities are retained only for a later confirmed verification step and are never invoked by M12 directly.

## 5. Checkpoint artifact

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

The four properties are own enumerable writable configurable data properties in the exact canonical order shown above.

`draft` is exactly the successful `status: "draft"` M10 artifact returned by `draftContractProtection()` for this preparation attempt. M12 does not modify its fields or create competing remediation semantics.

M12 does not claim cryptographic provenance for the checkpoint. A JSON-reconstructed checkpoint may be accepted later only if:

- the checkpoint outer record is descriptor-safe and has prototype local `Object.prototype` or `null`;
- its exact literals/keys pass this section; and
- the nested draft independently passes the existing M10 confirmation boundary when M12 immediately delegates it.

The nested M10 draft, not the wrapper, remains remediation authority.

## 6. Completion checkpoint validation

Before invoking M10 confirmation, `completeContractQualityLoop()` validates only the checkpoint wrapper surface needed to safely obtain `draft`:

- non-Proxy record;
- prototype local `Object.prototype` or `null`;
- exactly `version`, `kind`, `state`, `draft` own string-keyed data properties;
- no symbols/extras/accessors;
- `version === 1`;
- `kind === "contract-quality-loop-checkpoint"`;
- `state === "awaiting-confirmation"`.

M12 MUST NOT infer draft validity from the wrapper. It passes the captured `draft` descriptor value to `confirmContractProtection()`, which revalidates and captures the entire draft under M10.

Malformed or forged nested draft data therefore cannot bypass M10 merely by being wrapped in an M12 checkpoint.

## 7. Exact completion ordering

For a valid completion invocation, ordering is normative:

1. capture/validate M12 outer options and checkpoint wrapper;
2. capture evaluator identities;
3. call `confirmContractProtection({ draft, decision })` exactly once;
4. safely observe that M10 Promise;
5. if the protection is rejected, build the M12 rejected result and stop;
6. if the protection is confirmed, call `verifyContractProtection({ protection, evaluator, improvedEvaluator })` exactly once;
7. safely observe that M10 Promise;
8. build the M12 completed result without rewriting the verification payload.

No evaluator is called before M10 verification itself reaches its existing evaluator gates.

No M12 retry/fallback occurs on any throw/rejection/failure state.

## 8. Completion result

### 8.1 Rejected by human

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

### 8.2 Confirmed and verified/replayed

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

The M12 root is a fresh null-prototype record with exactly the five properties above as enumerable writable configurable data properties.

The nested M10 protection and verification objects remain independent M10-produced artifacts/results; M12 does not mutate them.

## 9. Promise and rejection behavior

M12 must observe M10 native Promises with captured Promise authority rather than ambient `await` / unknown-thenable assimilation inside the trusted boundary.

Because both delegated functions are package-owned M10 APIs, M12 accepts only the genuine local native Promises they return under their established contract.

M12-generated boundary failures use captured local `TypeError`.

A rejection from `draftContractProtection()`, `confirmContractProtection()`, or `verifyContractProtection()` propagates as the M12 public rejection reason with exact identity preserved. M12 MUST NOT wrap, stringify, normalize, or replace delegated rejection reasons.

Semantic M10 verification failures that resolve a verification result remain resolved results; M12 MUST NOT convert them into Promise rejection.

## 10. No new semantic authority

M12 MUST use the existing public M10 APIs, not reach into `contract-remediation.js` internals to reimplement private validators/builders/replay logic.

Authoritative ownership remains:

- M8: confirmed-contract attack generation, execution, ranking, replayable experiment emission;
- M10 draft: experiment/source/proposal binding;
- M10 confirm: accept/edit/reject semantics;
- M10 verify: baseline identity, improved replay, regression/source-caught semantics;
- M11: provider-neutral generation transport boundary only;
- M12: sequencing and explicit workflow state only.

M12 must not modify M8/M10/M11 result semantics to make orchestration easier.

## 11. Required proof matrix

Implementation is not complete until deterministic tests prove at least:

- exact prepare options reject omissions/extras/symbols/accessors/Proxies/non-local prototypes/non-ordinary descriptors;
- exact complete options reject the same malformed outer surfaces;
- prepare immediately delegates exactly once to M10 draft and performs zero provider/model/evaluator calls;
- caller mutation after prepare invocation cannot alter experiment/source/proposal authority observed by M10;
- prepare rejection reason from M10 propagates with exact identity;
- successful checkpoint has exact key order/literals/descriptors and null-prototype root;
- inherited `Object.prototype.then` poisoning executes zero times during checkpoint fulfillment;
- checkpoint JSON reconstruction with an otherwise valid M10 draft is accepted;
- malformed/forged checkpoint wrapper rejects before M10 confirmation;
- valid wrapper with malformed nested draft still rejects through M10 confirmation rather than bypassing it;
- complete immediately delegates exactly once to M10 confirmation;
- caller mutation after complete invocation cannot alter captured decision/draft authority;
- evaluator and improved-evaluator identities are captured before asynchronous confirmation settles;
- reject decision yields exact M12 rejected result, zero verify calls, and zero evaluator calls;
- accept decision invokes M10 verification exactly once;
- edit decision invokes M10 verification exactly once with the M10 edited confirmed protection;
- M10 verification semantic state is mirrored byte-for-byte in `result.state` and `result.verification` is not rewritten;
- M10 confirmation/verification Promise rejections propagate exact identity;
- complete result root is null-prototype and inherited `Object.prototype.then` executes zero times on fulfillment;
- M12 never invokes `runContractAttacks()`, a provider adapter, or a model callback;
- existing M8/M10/M11 tests remain unchanged and passing;
- package remains dependency-free;
- packed artifact exposes both M12 APIs to an isolated consumer.

## 12. First implementation slice

Slice A is intentionally narrow:

```text
prepareContractQualityLoop()
  -> exact outer capture
  -> immediate M10 draft delegation
  -> awaiting-confirmation checkpoint

completeContractQualityLoop()
  -> exact outer/checkpoint capture
  -> immediate M10 confirmation delegation
  -> reject stop OR confirmed M10 verification
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

## 13. Out of scope

M12 Slice A does not add:

- provider-specific SDK helpers;
- hosted provider execution;
- automatic survivor selection;
- proposal generation;
- AI-generated evaluator code;
- automatic code patching;
- an interactive terminal/UI confirmation prompt;
- persistence/database/session storage;
- multi-run history or collaboration;
- GitHub Actions integration;
- retries/failover/background execution;
- new verification scoring or ranking semantics.

## 14. Stopping rule

Runtime implementation MUST NOT begin until this architecture receives a clean exact-head Codex review.

Any ambiguity that could change human-confirmation timing, M10 authority, callback timing, rejection identity, Promise fulfillment safety, checkpoint reconstruction, or result semantics must be resolved in this document before runtime code is added.
