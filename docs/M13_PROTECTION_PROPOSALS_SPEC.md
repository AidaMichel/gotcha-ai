# M13 — AI-Assisted Contract Protection Proposals

Status: Architecture Draft — Revision 1
Milestone: 13
Branch: `milestone-13-protection-proposals`
Base: `main@dc57d0d845247d1aaae6c1605c10429f9c0c3a93`

## 1. Goal

M13 closes the remaining V0 `CATCH THIS` gap for the confirmed-contract path: Gotcha can already discover a replayable surviving attack and M10/M12 can draft, human-confirm, and verify a caller-supplied protection, but the caller still has to author the declarative `proposal` manually.

M13 adds one AI-assisted proposal-generation seam that turns one caller-selected replayable M8 survivor into **untrusted declarative M10 proposal data**.

The intended flow becomes:

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
- replayable-experiment and source-survivor binding;
- the exact generator request projection;
- proposal schema and authority binding;
- provider-neutral structured-output mode/format when M11 is used;
- safe asynchronous observation;
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

M10 Revision 20 already defines the exact declarative proposal shape:

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

M13 MUST NOT create a second incompatible remediation proposal schema.

M13 validates generator output so unsafe/provider-owned data is not exposed as trusted package output, but this validation does not replace M10 authority. If the proposal is later supplied to `prepareContractQualityLoop()` / `draftContractProtection()`, M10 revalidates it independently under its locked Revision-20 rules.

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

The separation is intentional. Proposal generation does not implicitly enter M10 drafting, and M12's locked public option schemas do not change in M13.

## 5. Exact top-level invocation boundary

The options record is exactly:

```js
{
  experiment,
  sourceAttackId,
  generator
}
```

No other own keys or symbol keys are accepted.

At invocation time, before returning the public Promise, M13 MUST synchronously:

1. descriptor-capture the exact outer options surface without invoking accessors;
2. capture `generator` by exact function identity;
3. reject a Proxy generator and require `typeof generator === "function"`;
4. capture/detach the non-callback `experiment` and primitive `sourceAttackId` authority using an M10/M8-compatible owned-data boundary;
5. retain no original mutable Object/Array identity as semantic authority.

As with M10/M12, public validation failure is represented by rejection of the normal local native Promise rather than a synchronous public validation throw.

Caller mutation after invocation cannot change experiment, source, or generator authority.

## 6. Source survivor binding

M13 accepts only an M10-replayable experiment variant.

Before calling `generator`, M13 MUST validate enough of the captured experiment to establish the exact same source facts M10 will later require:

- the experiment is replayable for M10 purposes;
- `sourceAttackId` is a primitive non-empty string;
- it identifies exactly one original baseline survivor in the captured experiment;
- the selected attack's `ruleId` identifies the exact embedded active contract rule;
- selected attack rule snapshot and embedded contract rule agree under M10/M8 authority rules.

M13 does not rank, substitute, or fall back to another survivor.

If `sourceAttackId` is missing, unknown, duplicated, non-surviving, or bound to a malformed/non-replayable experiment, generator execution count is exactly zero.

## 7. Generator request contract

For a valid invocation, M13 calls the captured generator exactly once with one detached request record:

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

Every Object/Array in the generator request is freshly owned by the M13 request projection. No evaluator callback or original experiment Object/Array identity crosses into the generator.

The request includes only the evidence needed to propose one declarative protection:

- task context;
- original case input and expected output;
- selected survivor identity;
- exact violated contract rule snapshot;
- selected surviving attack description/rationale/output.

No unrelated survivors are included in Revision 1.

### 7.1 Exact instructions

`instructions` is core-owned and semantically equivalent to:

```text
Propose one specific, testable declarative quality protection for the selected surviving attack.
Return only the required structured proposal data.
Bind the proposal to the supplied task, source attack, and rule.
Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.
The protection statement must describe what the quality system should enforce; the rationale must explain why this protection addresses the selected survivor.
```

The implementation MUST use one fixed package-owned instruction string for Revision 1. Caller/provider code cannot append, replace, or weaken these instructions through the M13 core API.

## 8. Generator output contract

The generator must return exactly one candidate M10 proposal record:

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

M13 accepts no alternate proposal schema, arrays of proposals, code fields, evaluator fields, confidence fields, auto-decision fields, provider metadata fields, or hidden executable values.

Before public fulfillment, M13 validates and detaches the complete candidate graph.

Required semantic bindings are exactly:

```text
version === 1
task === captured experiment.task
sourceAttackId === captured requested sourceAttackId
ruleId === selected survivor.ruleId
protection.statement is a primitive non-empty string
protection.rationale is a primitive non-empty string
```

Extra keys, symbols, accessors, Proxies, functions, unsupported primitives, cycles, repeated mutable identity, custom executable brands, or authority rebinding reject.

Accepted strings are preserved byte-for-byte. M13 does not rewrite, improve, summarize, or infer missing text after generator return.

## 9. Generator execution and async observation

Generator execution count is exactly one for a semantically valid invocation.

M13 performs no retries, provider fallback, second-model critique, repair prompt, or hidden health check.

Accepted generator return forms are:

1. a synchronous candidate proposal record; or
2. a safely observable Promise-branded asynchronous value.

Arbitrary thenables are not accepted by reading an unknown `.then` property.

For asynchronous observation, M13 MUST use captured Promise-brand/prototype/descriptor primitives and species-safe observation equivalent to the hardened M11/M12 pattern:

- reject Proxy/non-Promise async wrappers;
- verify the accepted Promise is safely shieldable before observing it;
- temporarily install a trusted own `constructor` / species path;
- invoke captured `Promise.prototype.then` exactly once;
- restore/delete the temporary shield synchronously;
- never use ambient `Promise.resolve()` / `await` as the classifier for an unknown returned value.

A synchronous generator throw or accepted Promise rejection is propagated by exact rejection identity after safe observation has been established.

Boundary failures produced by M13 use the captured local `TypeError` brand.

## 10. Public fulfillment result

Successful generation resolves a fresh null-prototype root:

```js
{
  version: 1,
  kind: "contract-protection-proposal-result",
  state: "proposal-ready",
  proposal
}
```

The null-prototype root prevents inherited `Object.prototype.then` from gaining Promise-fulfillment authority.

`proposal` is a fresh local ordinary M10-compatible schema record with its own fresh nested `protection` record. It shares no mutable Object/Array identity with:

- the captured experiment;
- the generator request;
- the generator return value;
- any other result path.

The public root contains exactly the four fields above and no provider metadata, model name, credentials, transport result, executable callback, or automatic human decision.

## 11. M11 provider-adapter extension

M13 additively extends `createStructuredProviderAdapter()` with one new mode:

```text
contract-protection
```

After M13, accepted adapter modes are exactly:

```text
quality-contract
contract-attacks
contract-protection
```

This is an explicit M13 supersession of the M11 Revision-4 two-mode literal set. All other M11 transport, credential, no-retry, request-ownership, response-detachment, and Promise-observation rules remain unchanged unless this specification states otherwise.

### 11.1 M13 adapter invocation shape

For `mode: "contract-protection"`, the incoming generator request is exactly the Section-7 request:

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

The adapter projects it into provider input without forwarding original identities.

`instructions` remains a separate provider-request field and is not duplicated inside `input`.

Provider input is exactly:

```js
{
  task,
  case,
  source,
  rule,
  attack
}
```

### 11.2 M13 structured output format

The existing M11 `gotcha-structured-v1` dialect gains a `contract-protection` schema describing exactly the M10 proposal shape:

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

The adapter schema is provider-format guidance only. M13 core performs exact semantic binding after generator return, and M10 independently revalidates the proposal if it enters remediation.

## 12. Explicit human boundary

M13 output is a **proposal**, not a confirmed protection.

The presence of `state: "proposal-ready"` MUST NOT be interpreted as human acceptance.

The required authority sequence remains:

```text
AI proposal
  -> M10 draft
  -> human inspects exact current draft
  -> human accept/edit/reject
  -> M10 verification
```

M13 MUST NOT create a shortcut where provider/model output is passed directly to verification or silently treated as an accepted rule.

## 13. Failure ordering

For a valid function call boundary, normative ordering is:

1. capture exact outer invocation descriptors and generator identity;
2. detach/capture experiment and source authority;
3. validate replayability and exact survivor/rule binding;
4. construct detached generator request;
5. invoke generator exactly once;
6. safely observe accepted async return if needed;
7. validate/detach exact proposal candidate;
8. enforce exact task/source/rule bindings;
9. construct the null-prototype proposal-ready public result;
10. fulfill the public local native Promise.

No generator call occurs before steps 1–3 succeed.

No M10/M12 call occurs inside M13.

## 14. Non-goals for M13

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

These require separate architecture decisions.

## 15. Required architecture proof matrix before runtime implementation

The architecture review must be able to answer all of the following unambiguously:

### Authority

- caller explicitly supplies `sourceAttackId`; no silent top-finding choice exists;
- M8/M10 source-survivor/rule authority is preserved;
- generated output cannot rebind task/source/rule;
- M10 remains independent remediation authority;
- M12 human-confirmation boundary is unchanged.

### Callback and ownership safety

- exact generator identity is captured synchronously;
- original experiment identities never cross to generator/provider;
- evaluator callbacks never cross the proposal seam;
- post-invocation caller mutation cannot change authority;
- generator return data is detached before exposure;
- public fulfillment root is null-prototype / then-safe.

### Generator execution

- malformed/non-replayable/unknown/non-surviving source performs zero generator calls;
- valid generation performs exactly one generator call;
- no retry/failover/repair generation exists;
- synchronous throw and accepted Promise rejection propagate correctly;
- arbitrary thenables do not gain execution authority;
- Promise species/constructor poisoning cannot execute during accepted async observation.

### Proposal semantics

- output is exactly the locked M10 proposal shape;
- statement/rationale are non-empty primitive strings;
- no executable values or extra authority fields are accepted;
- exact task/source/rule binding is mandatory;
- M13 does not rewrite provider text after return.

### M11 integration

- `contract-protection` is the only new adapter mode;
- provider input excludes callbacks/credentials and owns detached data;
- output format exactly describes the M10 proposal;
- adapter validation does not replace M13/M10 semantic authority.

## 16. Implementation gate

**No M13 runtime implementation should be added until this architecture receives a clean exact-head Codex review.**

After architecture is clean, Runtime Slice A should be limited to:

1. `generateContractProtectionProposal()` core seam;
2. the additive M11 `contract-protection` adapter mode;
3. public exports;
4. focused deterministic tests for the Section-15 proof matrix;
5. packed npm consumer proof;
6. README documentation showing explicit proposal -> M12 prepare -> human decision -> completion.

Runtime Slice A should not expand into persistence, automatic survivor selection, executable patch generation, or new orchestration beyond the boundaries above.
