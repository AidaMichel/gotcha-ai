# M13 — AI-Assisted Contract Protection Proposals

Status: Architecture Draft — Revision 2
Milestone: 13
Branch: `milestone-13-protection-proposals`
Base: `main@dc57d0d845247d1aaae6c1605c10429f9c0c3a93`

## 1. Goal

M13 closes the remaining V0 `CATCH THIS` gap for the confirmed-contract path: Gotcha can already discover a replayable surviving attack and M10/M12 can draft, human-confirm, and verify a caller-supplied protection, but the caller still has to author the declarative `proposal` manually.

M13 adds one AI-assisted proposal-generation seam that turns one caller-selected replayable M8 survivor into **untrusted declarative M10 proposal data**.

The intended flow is:

```text
runContractAttacks()
  -> caller chooses sourceAttackId
  -> generateContractProtectionProposal()
  -> proposal-ready result
  -> prepareContractQualityLoop()
  -> human inspects exact draft
  -> completeContractQualityLoop()
  -> verify / re-attack
```

M13 does **not** choose the survivor, confirm a protection, edit executable evaluator code, or verify remediation. M8 remains attack/survivor authority; M10 remains remediation authority; M12 remains quality-loop orchestration authority.

Revision 2 closes the Revision-1 review ambiguities by pinning:

1. the complete M10 Revision-20 replayable-experiment predicate before generator execution;
2. the exact outer-option descriptor/prototype policy and complete module-initialization intrinsic capture;
3. exact synchronous generator scheduling and `Reflect.apply(..., undefined, ...)` receiver semantics;
4. recursive preservation of schema-less replay key order in generator evidence;
5. one byte-exact package-owned instruction string;
6. an explicit M11-null-prototype -> M13-candidate -> ordinary-M10-proposal normalization boundary;
7. one exact external-Promise acceptance/species-shielding algorithm;
8. validation/detachment at the first M13 observation point; and
9. the exact descriptor/order/extensibility surface of the public result root.

## 2. Product and authority rule

AI may propose a **declarative protection statement and rationale**. AI is never remediation authority.

The caller remains authoritative for:

- which replayable survivor is selected via `sourceAttackId`;
- which provider/model/transport is used;
- whether the generated proposal is passed onward at all;
- the later human `accept | edit | reject` decision;
- all executable evaluator changes supplied to M10 verification.

Gotcha remains authoritative for:

- exact invocation capture;
- complete replayable-experiment validation and source-survivor binding;
- the exact detached generator request projection;
- proposal schema and authority binding;
- provider-neutral structured-output mode/format when M11 is used;
- safe callback execution and asynchronous observation;
- detached public result ownership.

M13 MUST NOT:

- auto-select `topFindingId` when the caller did not explicitly supply `sourceAttackId`;
- generate executable evaluator code;
- accept executable values inside proposal data;
- call M10 confirmation or verification;
- call M12 completion;
- silently accept/edit/reject a protection;
- claim that a generated proposal is already a protection;
- retry or fail over generator/provider work;
- read provider credentials or make hidden network calls.

## 3. Existing M10 proposal contract remains authoritative

M10 Revision 20 defines the exact remediation proposal shape:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection: {
    statement,
    rationale
  }
}
```

All shown strings are non-empty under M10's existing rule.

Bindings remain exactly:

```text
proposal.task === experiment.task
proposal.sourceAttackId === requested sourceAttackId
proposal.ruleId === selectedAttack.ruleId
```

M13 MUST NOT create a second remediation proposal schema.

M13 has a provider/generator **candidate boundary** before this M10 boundary. That candidate boundary may accept the safe null-prototype records emitted by M11, as defined in Section 9, but every successful candidate is normalized into a fresh ordinary local M10-compatible proposal before public fulfillment. M10 independently revalidates that ordinary proposal if it later enters `prepareContractQualityLoop()` / `draftContractProtection()`.

## 4. Public API

M13 adds exactly one new core API:

```js
const {
  generateContractProtectionProposal
} = require("gotcha-ai");
```

Invocation:

```js
const generated = await generateContractProtectionProposal({
  experiment,
  sourceAttackId,
  generator
});
```

The caller can then explicitly continue:

```js
const checkpoint = await prepareContractQualityLoop({
  experiment,
  sourceAttackId,
  proposal: generated.proposal
});
```

Proposal generation does not implicitly enter M10 drafting. M10 and M12 public option schemas do not change in M13.

## 5. Captured boundary authority

The same-realm bootstrap trust boundary is defined normatively in
`docs/BOOTSTRAP_TRUST_MODEL.md`. The package is not a same-process sandbox: the
module-local CommonJS loader plus the minimal reflection roots named there are
the trusted computing base required to inspect descriptors without invoking
accessors and to authenticate every later callable. Pre-first-load code that
has already replaced those roots has process-equivalent authority and is
outside this poisoning guarantee. No other ambient primitive or Node builtin
export receives that exemption.

At M13 module initialization, before any public invocation or generator execution, M13 captures every primitive used for public boundary classification, capture, projection, Promise observation, and candidate validation.

Required captures are exactly:

- `util.types.isProxy`;
- all M10 Revision-20 mandatory forbidden-brand probes from M10 Section 2.4;
- `Buffer.isBuffer`;
- `Object.getOwnPropertyDescriptors`;
- `Object.getOwnPropertyDescriptor`;
- `Object.getPrototypeOf`;
- `Object.isExtensible`;
- `Object.is`;
- `Object.defineProperty`;
- `Reflect.ownKeys`;
- `Reflect.apply`;
- `Reflect.deleteProperty`;
- `Array.isArray`;
- `Number.isFinite`;
- `String.prototype.trim`;
- `JSON.stringify`;
- `JSON.parse`;
- local `Object.prototype` and its captured original prototype;
- local `Array.prototype` and its captured original prototype relationship;
- local `Promise` constructor;
- local `Promise.prototype`;
- local `Promise.prototype.then`;
- `Symbol.species`;
- local `TypeError` constructor.

No later lookup through mutable globals/prototypes is authoritative for these operations.

M13 creates at module initialization one trusted `safePromiseSpeciesContainer` with exactly one own `Symbol.species` data property whose value is the captured local `Promise` constructor and whose descriptor is:

```text
writable: false
enumerable: false
configurable: false
```

If any mandatory captured primitive/probe is unavailable or non-callable where callable authority is required, M13 boundary authority is unavailable for that process. The public API still returns its normal local native Promise, rejected with a captured local boundary `TypeError` before generator execution.

## 6. Exact top-level invocation boundary and synchronous capture

The public options record is exactly:

```js
{
  experiment,
  sourceAttackId,
  generator
}
```

The outer record MUST satisfy the same exact record-surface policy as M10 Revision 20 Section 2.5 for these exact three keys:

- non-null object, not an Array;
- non-Proxy;
- no M10 mandatory forbidden intrinsic brand;
- prototype exactly captured local `Object.prototype` — `null`, custom, and cross-realm prototypes reject;
- extensible;
- `Reflect.ownKeys()` contains exactly `experiment`, `sourceAttackId`, `generator`, with no symbols/extras/omissions;
- all three are own data properties exactly writable/enumerable/configurable `true`;
- accessors, frozen/sealed/non-extensible wrappers, non-enumerable fields, non-writable/non-configurable fields, and alternate descriptor surfaces reject.

At invocation time, before the public function returns, M13 MUST synchronously:

1. classify/capture the exact outer descriptors using only Section-5 captures;
2. capture `generator` by exact descriptor value and require `typeof generator === "function"` and captured Proxy probe false;
3. capture `sourceAttackId` as its exact primitive descriptor value;
4. capture the complete `experiment` using the exact M10 Revision-20 non-callback invocation-capture rules, including one identity set for the entire captured experiment graph so cycles/repeated aliases and malformed descriptor/prototype/brand surfaces reject rather than being normalized away;
5. retain no original caller Object/Array identity as semantic authority.

Public validation failures do not throw as public synchronous validation errors. M13 creates/owns its normal local native Promise machinery and rejects that Promise with the captured local `TypeError`.

Caller mutation after invocation cannot change captured experiment, source, or generator identity.

## 7. Complete M10 replayable-experiment validation before generation

M13 MUST NOT use a selected-survivor-only or “validate enough” predicate.

Before constructing or invoking the generator request, the captured experiment MUST pass the **complete M10 Revision-20 replayable experiment predicate**. For M13 Revision 2, that predicate normatively incorporates every M10 Revision-20 requirement that `draftContractProtection()` applies before proposal processing, including:

- M10 Sections 2.1–2.12 value, brand, descriptor, prototype, number, tree, key-order, and snapshot rules;
- the exact prototype/`toJSON` baseline and captured JSON wire-probe rules in M10 Section 4;
- the exact confirmed-contract schema/rule-count/rule-enum/uniqueness rules in M10 Section 5;
- the exact replayable experiment schema and ownership/tree/wire-round-trip rules in M10 Sections 6.2–6.3;
- the exact attack count, attack schema, score/severity derivation, embedded-rule binding, retained-output, baseline-outcome, survivor-order, and `topFindingId` invariants in M10 Section 7;
- complete parsed revalidation after the `{ experiment: completeCandidateExperiment }` stringify/parse probe, including recursive schema-less own-key order reproduction and every cross-field invariant.

No M13 implementation may substitute a subset of those checks merely because only one survivor will be shown to the generator.

Only after the complete experiment passes does M13 validate source selection:

- `sourceAttackId` is a primitive M10-non-empty string;
- it identifies exactly one original baseline survivor in `baseline.survivorOrderIds`;
- exactly one attack record has that ID;
- the selected attack's `ruleId` identifies exactly one active embedded confirmed-contract rule;
- selected attack embedded rule snapshot exactly matches that active contract rule under M10 authority.

M13 never ranks, substitutes, or falls back to another survivor.

If the complete experiment is malformed/non-replayable, or the requested source is missing/unknown/duplicated/non-surviving/misbound, generator execution count is exactly zero.

## 8. Generator request, projection, scheduling, and receiver

After Sections 6–7 succeed, M13 constructs exactly one detached request:

```js
{
  task,
  case: {
    input,
    expectedOutput
  },
  source: {
    attackId,
    ruleId
  },
  rule: {
    id,
    statement,
    kind,
    severity
  },
  attack: {
    id,
    ruleId,
    type,
    description,
    rationale,
    output
  },
  instructions
}
```

Every request Object/Array is freshly allocated for this request. No evaluator callback or original/captured experiment container identity crosses into the generator.

For `case.input`, `case.expectedOutput`, and `attack.output`, M13 preserves **recursively and exactly** the captured schema-less own string-key sequence assigned by M10 Section 2.7. M13 MUST NOT lexical-sort, schema-sort, or otherwise reorder those record keys during projection. Arrays preserve exact element order. Schema records use the canonical key order shown above.

The generator call occurs **synchronously on the initial `generateContractProtectionProposal()` call stack**, after complete validation and request construction and before the public API invocation returns to its caller.

The exact call operation is equivalent to:

```js
Reflect.apply(generator, undefined, [request])
```

using the captured `Reflect.apply` identity.

The receiver is exactly `undefined`; M13 MUST NOT invoke the generator as a property of an internal capture/request/container object. No internal authority can leak through callback `this`.

Generator execution count is exactly one for a valid invocation. There are no retries, repair prompts, critiques, provider fallbacks, hidden probes, or duplicate calls.

### 8.1 Byte-exact instructions

The Revision-2 package-owned instruction value is exactly the following JavaScript string value, with `\n` between the five shown lines and **no trailing newline**:

```js
const CONTRACT_PROTECTION_INSTRUCTIONS_V1 =
  "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
  "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
  "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
  "The protection statement must describe what the quality system should enforce.\n" +
  "The rationale must explain why this protection addresses the selected survivor.";
```

No caller/provider/adaptor may append, prepend, replace, summarize, normalize whitespace in, or otherwise change these instruction bytes through the M13 core API.

## 9. Exact generator candidate boundary and M11 normalization

The generator must produce exactly one candidate shaped as:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection: {
    statement,
    rationale
  }
}
```

This is a **candidate input boundary**, not a widening of M10's public proposal boundary.

To support both direct generators and M11 safe detached output, candidate root and nested `protection` record each MUST satisfy all of these exact rules:

- non-null object and not Array;
- non-Proxy;
- no M10 mandatory forbidden intrinsic brand;
- prototype exactly captured local `Object.prototype` **or exactly `null`**;
- extensible;
- exact required own string-key set and no symbols/extras/omissions;
- every required property is an own data property exactly writable/enumerable/configurable `true`;
- no accessors or alternate descriptor surfaces.

Candidate exact key sets are:

```text
root       -> version, task, sourceAttackId, ruleId, protection
protection -> statement, rationale
```

Input key insertion order is not authority for these schema records.

The `null` prototype allowance exists specifically because M11 Section 11.1 rebuilds provider output roots as `Object.create(null)` and permits nested null-prototype records. M13 does not pass those null-prototype records directly into M10. After candidate validation, M13 normalizes them into fresh ordinary local records with prototype exactly local `Object.prototype`, canonical M10 key order, ordinary writable/enumerable/configurable data descriptors, and extensibility.

Required semantic bindings are exactly:

```text
version === 1
task === captured experiment.task
sourceAttackId === captured requested sourceAttackId
ruleId === selected survivor.ruleId
protection.statement is a primitive M10-non-empty string
protection.rationale is a primitive M10-non-empty string
```

Extra keys, symbols, accessors, Proxies, functions, unsupported primitives, cycles, repeated mutable identity, forbidden brands, or authority rebinding reject.

Accepted strings are preserved byte-for-byte. M13 does not rewrite, improve, summarize, trim-and-replace, or infer missing text after generator return.

### 9.1 First-observation detachment

A synchronous non-Promise candidate is validated and detached **immediately in the generator call stack**, before `generateContractProtectionProposal()` returns control to its caller.

For an accepted asynchronous generator Promise, candidate validation and complete detachment occur **synchronously inside M13's first fulfillment reaction**, before that reaction returns and before M13 queues any later semantic/public-fulfillment step.

M13 MUST NOT defer candidate capture to a later microtask. Mutation of a generator-retained candidate after the applicable first observation point cannot change M13 proposal authority.

## 10. Exact asynchronous return predicate and species-safe observation

Generator return classification never reads an arbitrary `.then` property and never uses ambient `await`, `Promise.resolve`, or another thenable assimilation mechanism on an unknown return value.

A generator return is treated as asynchronous only if all are true under captured primitives:

1. it is non-Proxy;
2. captured M10/M13 Promise brand probe reports true;
3. captured `Object.getPrototypeOf(value) === captured Promise.prototype`;
4. its own `constructor` descriptor is captured without property access and is either:
   - absent **and** the Promise is extensible; or
   - present and configurable;
5. therefore M13 can install and later restore/delete the trusted own-constructor shield without invoking user code.

A Promise with an own non-configurable `constructor` of any kind rejects as an M13 boundary failure before `Promise.prototype.then` is invoked. A Promise with no own constructor but which is non-extensible also rejects. Other thenables/wrappers are not asynchronous authority; if they do not independently satisfy the synchronous exact proposal-candidate boundary, they reject without executing a `then` property.

For every accepted asynchronous Promise, M13 performs exactly:

1. capture its current own `constructor` descriptor;
2. install, with captured `Object.defineProperty`, a temporary own `constructor` data property whose value is the Section-5 `safePromiseSpeciesContainer`, with descriptor `writable: true`, `enumerable: false`, `configurable: true`;
3. invoke captured `Promise.prototype.then` exactly once via captured `Reflect.apply`, with M13 fulfillment and rejection reactions;
4. synchronously restore the previous configurable own constructor descriptor exactly, or delete the temporary property with captured `Reflect.deleteProperty` if none existed;
5. require restoration/deletion success before observation is considered safely established.

The Promise returned by the captured `then` call is internal only and never becomes proposal authority or public output.

A synchronous generator throw rejects the public M13 Promise with the **exact thrown value identity**. After safe asynchronous observation is established, generator-Promise rejection rejects the public M13 Promise with the **exact rejection identity**. M13-created boundary/setup/validation failures reject with a new captured-local `TypeError`; error text is non-authoritative.

## 11. Public fulfillment result and exact surface

Successful generation resolves a fresh null-prototype root constructed in exactly this own-key order:

```text
version
kind
state
proposal
```

with values:

```js
{
  version: 1,
  kind: "contract-protection-proposal-result",
  state: "proposal-ready",
  proposal
}
```

The root requirements are exact:

- prototype exactly `null`;
- extensible;
- `Reflect.ownKeys()` exactly `["version", "kind", "state", "proposal"]` in that order;
- every property is an own data property exactly writable/enumerable/configurable `true`;
- no symbols, extras, accessors, non-enumerable fields, alternate descriptors, sealing, or freezing.

The null-prototype root prevents inherited `Object.prototype.then` from gaining native-Promise fulfillment authority.

`proposal` is the fresh ordinary local M10-compatible record normalized in Section 9, with its own fresh ordinary `protection` record. It shares no mutable Object/Array identity with:

- the caller experiment;
- the captured experiment;
- the generator request;
- the generator return value;
- any other result path.

The public result contains no provider metadata, model name, credentials, transport result, executable callback, or automatic human decision.

## 12. M11 provider-adapter extension

M13 additively extends `createStructuredProviderAdapter()` with exactly one new mode:

```text
contract-protection
```

After M13, accepted adapter modes are exactly:

```text
quality-contract
contract-attacks
contract-protection
```

This is an explicit supersession only of the M11 Revision-4 two-mode literal set. All other M11 construction, transport, credential, no-retry, request ownership, response detachment, Promise observation, and safe-fulfillment-root rules remain unchanged unless this section states otherwise.

### 12.1 Exact adapter incoming request and provider input

For `mode: "contract-protection"`, the incoming generator request is exactly Section 8:

```js
{
  task,
  case,
  source,
  rule,
  attack,
  instructions
}
```

M11 applies its descriptor-safe own-data projection to this request. Its provider `input` is exactly:

```js
{
  task,
  case,
  source,
  rule,
  attack
}
```

`instructions` remains the exact Section-8.1 byte string in the separate provider-request `instructions` field and is not duplicated inside `input`.

The adapter projection MUST preserve recursive schema-less own-key order for `case.input`, `case.expectedOutput`, and `attack.output` rather than sorting those records.

### 12.2 Exact M11 output-format extension

The existing `gotcha-structured-v1` dialect gains exactly this `contract-protection` schema:

```js
{
  dialect: "gotcha-structured-v1",
  type: "record",
  required: [
    "version",
    "task",
    "sourceAttackId",
    "ruleId",
    "protection"
  ],
  additionalProperties: false,
  properties: {
    version: { type: "literal", value: 1 },
    task: { type: "string", minLength: 1 },
    sourceAttackId: { type: "string", minLength: 1 },
    ruleId: { type: "string", minLength: 1 },
    protection: {
      type: "record",
      required: ["statement", "rationale"],
      additionalProperties: false,
      properties: {
        statement: { type: "string", minLength: 1 },
        rationale: { type: "string", minLength: 1 }
      }
    }
  }
}
```

The adapter schema is provider-format guidance only. M11 still detaches provider output under its own safety rules and may return a null-prototype root/nested records. M13 Section 9 explicitly accepts that safe surface and normalizes it to the ordinary M10 proposal surface. M13 then enforces exact task/source/rule semantic binding, and M10 independently revalidates if remediation starts.

## 13. Explicit human boundary

M13 output is a **proposal**, not a confirmed protection.

`state: "proposal-ready"` MUST NOT be interpreted as human acceptance.

The authority sequence remains:

```text
AI proposal
  -> M10 draft
  -> human inspects exact current draft
  -> human accept/edit/reject
  -> M10 verification
```

M13 MUST NOT create a shortcut where provider/model output is passed directly to verification or silently treated as an accepted rule.

## 14. Normative execution and failure ordering

For every invocation the observable ordering is:

1. create/retain normal local public Promise settlement authority;
2. synchronously classify/capture exact outer descriptors and generator identity;
3. synchronously capture experiment/source authority under M10-compatible capture rules;
4. synchronously perform the complete Section-7 M10 replayable-experiment validation and exact requested-survivor binding;
5. synchronously construct the detached Section-8 request;
6. synchronously invoke the generator exactly once via captured `Reflect.apply(generator, undefined, [request])`, before returning from the public API call;
7. if generator returned a synchronous candidate, validate/detach it immediately on that same call stack;
8. otherwise classify/establish Section-10 asynchronous observation before returning; when fulfilled, validate/detach synchronously in M13's first fulfillment reaction;
9. enforce exact proposal bindings and normalize to a fresh ordinary M10-compatible proposal;
10. construct the exact Section-11 null-prototype public result;
11. fulfill the public local native Promise with that result.

No generator call occurs before steps 2–5 succeed.

No M10 confirmation/verification or M12 completion call occurs inside M13.

## 15. Non-goals for M13

M13 intentionally does not add:

- automatic survivor selection;
- automatic proposal approval;
- automatic statement editing after generation;
- executable evaluator generation or patching;
- persistence/background workflows;
- proposal history or learning loops;
- multi-proposal ranking;
- provider retries/failover;
- provider SDK dependencies;
- credentials/environment-variable loading;
- telemetry;
- a hosted service;
- changes to M10 decision semantics;
- changes to M12 checkpoint/completion schemas.

## 16. Required architecture proof matrix before runtime implementation

### Complete experiment authority

- the complete M10 Revision-20 replayable-experiment predicate runs before any generator call;
- an invalid unrelated attack/outcome/alias/descriptor/wire invariant causes zero generator calls;
- caller explicitly supplies `sourceAttackId`; no silent top-finding choice exists;
- requested survivor and embedded active rule bindings are exact.

### Invocation and callback safety

- every boundary-sensitive intrinsic is captured at module initialization;
- exact outer options require local `Object.prototype`, extensibility, and ordinary writable/enumerable/configurable data descriptors;
- generator identity and experiment/source authority are captured synchronously;
- generator is called synchronously before API return, exactly once, with receiver `undefined`;
- no internal capture object is observable as callback `this`;
- evaluator callbacks never cross the proposal seam.

### Request ownership

- no caller/captured experiment Object/Array identity crosses to generator/provider;
- schema-less key order is recursively preserved for case/attack evidence;
- exact instruction bytes are testable and caller-invariant.

### Generator return and async safety

- synchronous candidates are detached before initial API return;
- async candidates are detached in M13's first fulfillment reaction;
- arbitrary thenables do not gain execution authority;
- the exact accepted external-Promise predicate is deterministic;
- temporary constructor/species shielding uses the trusted package-owned species container and exact restore/delete behavior;
- synchronous throw / accepted Promise rejection identity is preserved;
- M13-created boundary errors use captured local `TypeError`.

### Proposal normalization

- M11 null-prototype output roots/nested records are explicitly accepted only under the exact candidate descriptor boundary;
- candidate null-prototype records are normalized to fresh ordinary local M10-compatible records;
- generated output cannot rebind task/source/rule;
- statement/rationale are non-empty primitive strings preserved byte-for-byte;
- no executable values or extra authority fields are accepted.

### Public result

- fulfillment root is null-prototype and then-safe;
- exact key order is `version`, `kind`, `state`, `proposal`;
- exact ordinary mutable data descriptors and extensibility are specified;
- proposal/result identities are fully detached.

### M11 and human-boundary integration

- `contract-protection` is the only new M11 mode;
- provider input excludes callbacks/credentials and preserves relevant replay key order;
- output format exactly describes candidate M10 proposal data;
- M11 adapter validation does not replace M13 semantic binding or M10 remediation validation;
- M12's exact human inspection/decision boundary remains unchanged.

## 17. Implementation gate

**No M13 runtime implementation should be added until this architecture receives a clean exact-head Codex review.**

After architecture is clean, Runtime Slice A is limited to:

1. `generateContractProtectionProposal()` core seam;
2. the additive M11 `contract-protection` adapter mode;
3. public exports;
4. focused deterministic tests for Section 16;
5. packed npm consumer proof;
6. README documentation showing explicit proposal -> M12 prepare -> human decision -> completion.

Runtime Slice A must not expand into persistence, automatic survivor selection, executable patch generation, or new orchestration beyond the boundaries above.
