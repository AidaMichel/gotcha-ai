# M11 — Provider Adapter Boundary

Status: Architecture Draft — Revision 4
Milestone: 11
Branch: `milestone-11-provider-adapters`
Base: `main@0c3287c4ea5ef181db564eb371e4f2b7b5d8fa49`

## 1. Goal

M11 makes Gotcha easier to connect to real model providers without moving provider credentials, HTTP transport, retries, model selection, or executable evaluator changes into the deterministic quality core.

Revision 4 standardizes one provider-neutral adapter boundary for the two existing AI-assisted seams:

- Quality Contract drafting (`draftQualityContract` generator input/output)
- confirmed-contract attack generation (`runContractAttacks` generator input/output)

M10 remediation remains unchanged. M11 does not add provider execution inside `draftContractProtection()`.

## 2. Product and authority rule

Provider adapters are convenience infrastructure, never semantic authority.

Gotcha core remains authoritative for:

- task/contract authority;
- provider-request mode;
- generation instructions;
- structured-output format authority;
- M7/M8 schema and semantic validation;
- evidence/rule binding;
- attack filtering/ranking;
- replayability;
- confirmation and remediation verification.

The caller owns:

- provider/model choice;
- credentials;
- SDK/HTTP implementation;
- authentication;
- timeout/retry/failover policy outside the adapter;
- provider availability/billing;
- translating provider SDK output into the exact provider-neutral response envelope below.

The adapter MUST NOT retry, fail over, read credentials, infer missing semantic fields, generate executable evaluator code, or make draft authority implicit.

## 3. No built-in secrets or hidden networking

The package MUST NOT implicitly read provider secret environment variables, persist credentials, ship a hidden hosted endpoint, make a network call during construction, or send telemetry/provider prompts anywhere except the caller-supplied `transport`.

M11 remains dependency-free. Provider SDKs remain consumer dependencies.

## 4. Public API and construction boundary

M11 adds exactly:

```js
const { createStructuredProviderAdapter } = require("gotcha-ai");
```

Construction:

```js
const generator = createStructuredProviderAdapter({
  transport,
  model,
  mode
});
```

The construction argument MUST be a non-Proxy local record with prototype exactly local `Object.prototype` or `null` and exactly three own string-keyed data properties:

```text
transport
model
mode
```

No extra string keys, symbol keys, inherited option authority, or accessors are permitted. Validation MUST capture descriptors before reading values. Invalid construction input throws a synchronous local `TypeError` without invoking getters or Proxy traps.

`transport` MUST be a non-Proxy callable function.

`model` MUST be a primitive non-empty canonical string with `model === model.trim()`.

`mode` MUST be exactly:

```text
quality-contract
contract-attacks
```

Construction performs zero transport calls, zero environment-secret reads, and zero network work.

The returned generator always returns a genuine local native Promise.

## 5. Invocation capture

Invocation capture is synchronous and MUST finish before the single transport call starts. If capture fails, transport is not called and the generator Promise rejects with a local `TypeError`.

The adapter MUST never pass an original M7/M8 object/array identity to transport.

### 5.1 Outer generator request shape

For `quality-contract`, the incoming generator request has exactly these own data properties:

```js
{
  task,
  examples,
  instructions
}
```

For `contract-attacks`, it has exactly:

```js
{
  contract,
  input,
  expectedOutput,
  instructions
}
```

The OUTER request record itself MUST be non-Proxy, descriptor-safe, and contain no extra string keys, symbol keys, accessors, or inherited semantic properties.

### 5.2 Input-projection compatibility with M7/M8

Nested invocation values are not restricted to local `Object.prototype` / `Array.prototype` identities, because current M8 intentionally supplies callback-isolated data whose records/arrays use authenticated frozen callback prototypes.

For INVOCATION CAPTURE ONLY, the adapter uses a core-owned **own-data projection** compatible with the existing M7/M8 AI-data boundary:

- reject Proxy values and recognized forbidden live runtime brands before semantic traversal;
- inspect only captured own descriptors;
- reject accessors, symbol keys, sparse arrays, executable values, unsupported primitives, and cycles;
- never read or execute prototype properties;
- accept ordinary arrays and record-shaped values even when their current prototype is an authenticated/erased callback prototype from M7/M8;
- rebuild accepted values into fresh adapter-owned ordinary request data.

The source prototype itself contributes **zero semantic authority** to the provider request.

Custom/private prototype behavior is never forwarded. Only validated own-data projection crosses the adapter boundary.

### 5.3 Shared references in invocation input

M8 permits shared identity because identity is non-semantic. Therefore invocation capture MUST NOT reject repeated object/array identity merely because two paths point to the same acyclic source value.

For invocation capture:

- cycles reject;
- repeated acyclic references are normalized by independently projecting each occurrence into the destination tree;
- no shared mutable source identity is preserved into the provider request.

Example:

```js
const shared = { value: 1 };
const input = { a: shared, b: shared };
```

becomes two detached equal-but-distinct projected records under provider request `input`.

### 5.4 Exact mode-specific provider input

`quality-contract` produces:

```js
input = {
  task,
  examples
}
```

`contract-attacks` produces:

```js
input = {
  contract,
  input,
  expectedOutput
}
```

`instructions` is never duplicated inside this `input` object.

Mutation of original invocation values after capture completes cannot alter the provider request.

## 6. Core-owned outputFormat dialect

Transport MUST NOT invent Gotcha's structured-output shape.

Revision 4 defines one exact declarative dialect:

```text
gotcha-structured-v1
```

Every provider request contains:

```js
outputFormat = {
  version: 1,
  kind: "gotcha-output-format",
  mode,
  schema
}
```

`schema` is a plain declarative object in the exact dialect below. This is provider-format guidance, not a replacement for M7/M8 validation.

Dialect vocabulary is exactly:

```text
type: "record" | "array" | "string" | "number" | "literal" | "union" | "ai-data"
properties: record property map
required: array of required property names
additionalProperties: boolean
items: array item schema
minItems / maxItems: integer bounds
minLength: integer string bound
enum: exact string alternatives
minimum / maximum: numeric bounds
value: literal value
anyOf: union alternatives
```

A transport may translate this dialect into provider-specific JSON Schema/tool configuration, but it MUST NOT mutate the Gotcha-owned object or substitute a competing semantic schema.

### 6.1 Exact `quality-contract` schema version 1

```js
{
  dialect: "gotcha-structured-v1",
  type: "record",
  required: ["version", "task", "rules"],
  additionalProperties: true,
  properties: {
    version: { type: "literal", value: 1 },
    task: { type: "string", minLength: 1 },
    rules: {
      type: "array",
      minItems: 0,
      maxItems: 7,
      items: {
        type: "record",
        required: [
          "id",
          "statement",
          "kind",
          "severity",
          "confidence",
          "rationale",
          "evidence"
        ],
        additionalProperties: true,
        properties: {
          id: { type: "string", minLength: 1 },
          statement: { type: "string", minLength: 1 },
          kind: {
            type: "string",
            enum: ["required", "forbidden", "conditional"]
          },
          severity: {
            type: "string",
            enum: ["critical", "major", "minor"]
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"]
          },
          rationale: { type: "string", minLength: 1 },
          evidence: {
            type: "array",
            minItems: 1,
            items: {
              type: "union",
              anyOf: [
                {
                  type: "record",
                  required: ["type"],
                  additionalProperties: true,
                  properties: {
                    type: { type: "literal", value: "task" }
                  }
                },
                {
                  type: "record",
                  required: ["type", "exampleId"],
                  additionalProperties: true,
                  properties: {
                    type: { type: "literal", value: "example" },
                    exampleId: { type: "string", minLength: 1 }
                  }
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

M7 remains authoritative for exact task equality, duplicate rule IDs, evidence reference validity, and all existing semantic checks.

### 6.2 Exact `contract-attacks` schema version 1

```js
{
  dialect: "gotcha-structured-v1",
  type: "record",
  required: ["version", "task", "attacks"],
  additionalProperties: true,
  properties: {
    version: { type: "literal", value: 1 },
    task: { type: "string", minLength: 1 },
    attacks: {
      type: "array",
      minItems: 0,
      maxItems: 20,
      items: {
        type: "record",
        required: [
          "id",
          "ruleId",
          "type",
          "description",
          "rationale",
          "mutatedOutput",
          "scores"
        ],
        additionalProperties: true,
        properties: {
          id: { type: "string", minLength: 1 },
          ruleId: { type: "string", minLength: 1 },
          type: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          rationale: { type: "string", minLength: 1 },
          mutatedOutput: { type: "ai-data" },
          scores: {
            type: "record",
            required: ["realism", "subtlety", "novelty", "fixability"],
            additionalProperties: true,
            properties: {
              realism: { type: "number", minimum: 0, maximum: 1 },
              subtlety: { type: "number", minimum: 0, maximum: 1 },
              novelty: { type: "number", minimum: 0, maximum: 1 },
              fixability: { type: "number", minimum: 0, maximum: 1 }
            }
          }
        }
      }
    }
  }
}
```

`ai-data` means the existing M8 AI-safe declarative value domain. M8 remains authoritative for exact task equality, rule references, duplicate IDs, score finiteness, attack filtering, output difference, deduplication, and all existing semantic checks.

## 7. Exact provider request envelope

After capture, the adapter creates exactly:

```js
{
  version: 1,
  kind: "gotcha-provider-request",
  mode,
  model,
  instructions,
  outputFormat,
  input
}
```

These are exactly seven own enumerable data properties, no symbols.

`instructions` is the exact primitive string supplied by M7/M8 and MUST NOT be rewritten, appended, prepended, summarized, or inferred.

No evaluator callback, protection callback, credential, environment value, or executable authority appears in the request.

## 8. Transport invocation semantics

Each valid generator invocation calls transport exactly once:

```js
transport(request)
```

with one argument.

No adapter retries, failover, duplicate probes, hidden health checks, fallback model calls, or timeout retries are permitted.

The first synchronous throw or accepted asynchronous rejection ends the invocation and transport call count remains one.

## 9. Accepted transport return forms

Transport may return:

1. a synchronous provider-response envelope; or
2. a Promise-branded object satisfying the exact observable and descriptor-level acceptance state below.

Promise acceptance is based on observable current state, not impossible historical allocation provenance.

An asynchronous value is accepted only when all are true:

- it is non-Proxy;
- captured `util.types.isPromise(value) === true`;
- captured `Object.getPrototypeOf(value) === captured Promise.prototype` at classification time;
- its own `constructor` descriptor, captured without property access, is either absent on an extensible Promise object or is configurable;
- therefore the adapter can install a temporary safe own `constructor` data property before invoking captured `Promise.prototype.then` and restore/delete that property immediately afterward.

A Promise with an own non-configurable `constructor` property of any kind is rejected with a local `TypeError` before the adapter invokes `Promise.prototype.then`. A Promise with no own `constructor` but which is non-extensible is likewise rejected, because the adapter cannot install the required safe shield. In particular, a non-configurable own accessor is never executed merely to classify or observe the Promise.

No claim is made about whether the object was historically allocated by a subclass or another realm before its current observable state became indistinguishable from an accepted Promise.

All other thenables/asynchronous wrappers reject with a local `TypeError`. The adapter MUST NOT classify by reading arbitrary `then` properties and MUST NOT use ambient `await` / `Promise.resolve` on unknown transport values.

For an accepted Promise, the observation algorithm is normative:

1. capture the current own `constructor` descriptor;
2. prove the Promise is shieldable under the rules above;
3. install a trusted own `constructor` data property whose species behavior is owned by Gotcha;
4. invoke captured `Promise.prototype.then` exactly once for adapter observation;
5. synchronously restore the prior configurable own descriptor, or delete the temporary shield when no prior descriptor existed;
6. if shielding/restoration itself cannot be completed without invoking user code, reject with a local `TypeError` rather than observing the Promise unsafely.

This prevents hostile inherited or own constructor/species hooks from executing during adapter Promise observation.

The public generator always returns a genuine local native Promise.

## 10. Provider response envelope and output data

The provider response MUST be validated before reading `output`.

Outer response requirements:

- non-Proxy local plain record;
- prototype local `Object.prototype` or `null`;
- exactly own data properties `version`, `kind`, `output`;
- no extra string keys;
- no symbols;
- no accessors;
- `version === 1`;
- `kind === "gotcha-provider-response"`.

Normative order:

1. reject Proxy/non-record outer values;
2. capture all own descriptors;
3. verify exact key set and data descriptors;
4. verify `version` and `kind` literals from descriptor values;
5. only then obtain the `output` descriptor value;
6. require `output` itself to be a record root compatible with the selected current M7/M8 generator schema;
7. validate/detach the output graph.

An accessor-backed `output` rejects without invoking its getter.

### 10.1 Required output root

Revision 4 requires the provider `output` root to be a record, because both current supported generator contracts are record-root contracts:

- M7 output root: `{ version, task, rules, ... }`;
- M8 output root: `{ version, task, attacks, ... }`.

A primitive, `null`, or array used as the top-level provider `output` is therefore an M11 boundary failure and MUST reject with a local `TypeError` before public Promise fulfillment. This restriction does not narrow nested M8 `mutatedOutput`, which may still be any valid `ai-data` value including primitives or arrays.

The record root may be a safely projectable provider-owned plain record under the same descriptor-safe response rules. It is rebuilt as a fresh null-prototype record during detachment.

Provider output beneath that required record root recursively accepts only declarative M7/M8-compatible AI data: null, booleans, finite numbers, strings, dense arrays, and plain record projections. It rejects functions, accessors, Proxies, cycles, sparse arrays, symbols, undefined, bigint, non-finite numbers, recognized live runtime brands, custom executable values, and repeated mutable identity.

Unlike invocation input, **provider output repeated mutable identity rejects**. Provider output must form a unique ownership tree.

## 11. Response ownership and asynchronous observation point

For synchronous transport return, response validation/detachment begins immediately after the single transport call returns.

For accepted Promise transport return, the relevant isolation point is the adapter's own first fulfillment observation, not the provider Promise's earlier settlement instant.

A transport may have registered earlier reactions that mutate its fulfillment object before the adapter's reaction runs. Those earlier mutations are part of the value the adapter legitimately observes. M11 does not claim impossible isolation from them.

Once the adapter's fulfillment reaction begins:

- it validates and fully detaches the observed response before fulfilling the public generator Promise;
- mutations occurring after that completed detachment cannot alter the returned snapshot;
- no transport-owned object/array identity is exposed to M7/M8;
- mutation of the returned snapshot cannot mutate retained transport-owned data.

The detached output is mutable local data, not frozen.

### 11.1 Safe fulfillment root

Both current M7 and M8 generator outputs are required to have a record root, and Section 10.1 now makes that an explicit M11 boundary requirement before fulfillment.

M11 rebuilds the detached OUTPUT ROOT as a fresh `Object.create(null)` record. Nested records may also use null prototypes; nested arrays remain ordinary arrays.

Because Promise resolution performs thenable lookup only on the fulfillment root, the required null-prototype record root guarantees fulfillment cannot execute or assimilate an inherited `Object.prototype.then` / custom prototype `then` hook. Arrays and primitives are never used as the public fulfillment root in Revision 4; top-level non-record outputs reject before resolution.

The detached root contains no own executable `then`. Any provider output with an own executable `then` is rejected by the declarative-data boundary before fulfillment.

Required regressions MUST:

- poison inherited `Object.prototype.then` and prove generator fulfillment executes it zero times;
- return an otherwise declaratively safe top-level array and primitive as provider `output` and prove both reject with local `TypeError` before fulfillment;
- prove nested arrays/primitives inside a valid record-root output remain accepted when valid under the selected M7/M8 schema.

## 12. Failure and rejection identity

Construction failures are synchronous local `TypeError`s.

Adapter-generated invocation/return-form/Promise-shield/response/data boundary failures reject with a local `TypeError`.

A synchronous throw from the one transport call MUST become the public generator Promise rejection reason with **exact object/value identity preserved unconditionally**.

An accepted transport Promise rejection MUST become the public generator Promise rejection reason with **exact object/value identity preserved unconditionally**.

The adapter MUST NOT inspect, clone, stringify, normalize, wrap, or assimilate the rejection reason merely to propagate it.

No vague integrity exception exists in Revision 4.

## 13. Deterministic proof matrix

All tests use deterministic fake transports; no API key, provider account, or network call is required.

Required proofs include:

- exact descriptor-safe construction record;
- zero construction side effects / environment reads / transport calls;
- exact outer invocation shapes for both modes;
- M8 callback-isolated custom prototypes are accepted through own-data projection;
- custom prototype behavior is not forwarded;
- shared acyclic invocation aliases normalize into distinct detached request branches;
- cycles still reject;
- exact per-mode request `input` and no duplicated `instructions`;
- exact version-1 `gotcha-structured-v1` `outputFormat` object for each mode;
- transport receives a detached copy and cannot mutate core-owned schema authority;
- full request capture precedes transport invocation;
- transport called exactly once on success, sync throw, and async rejection;
- sync throw reason identity preserved exactly;
- async rejection reason identity preserved exactly;
- no retry/fallback/failover;
- synchronous response envelope accepted;
- Promise acceptance tested by exact observable brand/current-prototype plus descriptor-level shieldability rule;
- Promise with non-configurable own `constructor` accessor/data property rejects before adapter observation and executes no accessor/species hook;
- non-extensible Promise with no own `constructor` rejects before adapter observation;
- arbitrary thenables / Proxy Promises / wrong-current-prototype Promise objects reject without reading attacker-controlled `then`;
- hostile Promise species/constructor hooks are not executed by accepted adapter observation;
- outer response accessors/symbols/extras/Proxies/wrong literals reject before `output` access;
- top-level provider `output` primitive/null/array rejects as a boundary failure;
- valid record-root output with nested arrays/primitives is accepted subject to M7/M8 semantics;
- provider output repeated identity rejects;
- asynchronous ownership proof starts at adapter observation: after detachment completes, retained transport mutation cannot affect returned data;
- returned-data mutation cannot affect transport-owned data;
- inherited `Object.prototype.then` poisoning executes zero times during public fulfillment;
- M7/M8 still reject semantically invalid but structurally safe provider output under their existing rules;
- both adapter modes integrate with existing public M7/M8 APIs;
- package remains dependency-free;
- packed npm artifact exposes `createStructuredProviderAdapter()` to an isolated consumer.

## 14. First implementation slice

Slice A remains intentionally narrow:

```text
createStructuredProviderAdapter()
  -> exact construction capture
  -> M7/M8-compatible invocation own-data projection
  -> alias normalization / cycle rejection
  -> core-owned exact outputFormat v1
  -> one provider request
  -> exactly-one transport call
  -> safe sync / shieldable observable-Promise result handling
  -> exact descriptor-safe response envelope
  -> required record-root provider output
  -> detached null-prototype fulfillment root
  -> M7/M8 integration proof
```

No OpenAI/Anthropic/Gemini SDK-specific helper is included in Slice A.

## 15. Stopping rule

Runtime implementation MUST NOT begin until this architecture receives a clean exact-head Codex review.

Any new ambiguity around M7/M8 compatibility, output schema authority, Promise behavior, rejection identity, response ownership, inherited thenable behavior, secrets, or executable boundaries must be resolved in this document first.