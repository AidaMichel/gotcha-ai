# M11 — Provider Adapter Boundary

Status: Architecture Draft — Revision 2
Milestone: 11
Branch: `milestone-11-provider-adapters`
Base: `main@0c3287c4ea5ef181db564eb371e4f2b7b5d8fa49`

## 1. Goal

M11 makes Gotcha easier to connect to real model providers without moving provider credentials, HTTP transport, retries, model selection, or executable evaluator changes into the deterministic quality core.

The milestone standardizes one small provider-neutral adapter boundary for the two existing AI-assisted seams:

- Quality Contract drafting (`draftQualityContract` generator input/output)
- confirmed-contract attack generation (`runContractAttacks` generator input/output)

M10 remediation remains declarative in core. M11 Revision 2 does not add provider execution inside `draftContractProtection()`.

## 2. Product rule

Provider adapters are convenience infrastructure, never semantic authority.

Gotcha core remains authoritative for:

- task/contract authority;
- provider-request mode and output-format authority;
- schema validation;
- evidence and rule binding;
- attack retention/ranking;
- replayability;
- human confirmation;
- remediation verification.

The adapter caller owns:

- provider and model choice;
- API credentials;
- HTTP client or SDK;
- request authentication;
- timeout policy;
- retry/failover policy outside the adapter;
- provider availability and billing;
- mapping provider SDK results into the exact provider-neutral response envelope defined here.

No provider adapter may make an unconfirmed draft authoritative, generate executable evaluator code, bypass existing M7/M8 validation, silently mutate input authority, retry provider work, or infer missing semantic fields.

## 3. No built-in secrets or network authority

The `gotcha-ai` package MUST NOT:

- read `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or any other secret implicitly;
- read arbitrary environment variables for provider credentials or endpoint selection;
- persist credentials;
- ship a hidden hosted endpoint;
- make network requests merely because an adapter is constructed;
- send telemetry or provider prompts anywhere other than the caller-supplied `transport`.

Revision 2 keeps the package dependency-free. Provider SDK dependencies remain in consumer applications.

## 4. Public API

Revision 2 adds exactly one provider-neutral factory:

```js
const {
  createStructuredProviderAdapter
} = require("gotcha-ai");
```

Construction:

```js
const adapter = createStructuredProviderAdapter({
  transport,
  model,
  mode
});
```

### 4.1 Exact construction record

The construction argument MUST be a non-Proxy local plain record whose prototype is exactly the local `Object.prototype` or `null`.

It MUST contain exactly these three own string-keyed properties, in any property order:

```text
transport
model
mode
```

It MUST contain:

- no extra string keys;
- no symbol keys;
- no inherited option authority;
- no accessor properties.

All three properties MUST be own data properties. Construction validation MUST inspect own property descriptors before reading any option value. Invalid construction input MUST throw a synchronous local `TypeError` without invoking getters or Proxy traps.

`transport` MUST be a non-Proxy callable function.

`model` MUST be a primitive string satisfying all of the following:

- length is greater than zero;
- `model === model.trim()`;
- therefore whitespace-only and leading/trailing-whitespace model identifiers are invalid.

`mode` MUST be exactly one of:

```text
"quality-contract"
"contract-attacks"
```

Construction MUST NOT invoke `transport`, inspect environment secrets, or perform network work.

The factory returns one callable generator compatible with the selected existing Gotcha generator boundary.

Generator invocation always returns a genuine local native Promise.

## 5. Invocation capture and exact mode input

Generator invocation input is authority-bearing data and MUST be captured before provider work begins.

For every invocation, the adapter MUST synchronously complete validation and detached snapshotting of the entire accepted generator request before invoking `transport`.

If invocation capture fails, `transport` MUST NOT be called and the returned local native Promise MUST reject with a local `TypeError`.

The adapter MUST NOT pass any original M7/M8 request object, nested object, or array identity to `transport`.

### 5.1 `quality-contract` mode

The incoming generator request MUST be a non-Proxy local plain record containing exactly these own data properties:

```js
{
  task,
  examples,
  instructions
}
```

No extra string keys, symbol keys, accessors, or inherited authority are permitted.

The adapter captures:

```js
input = {
  task,
  examples
}
```

`instructions` is NOT duplicated inside `input`; it is carried only in the top-level provider request field defined in Section 7.

`task` and `examples` MUST be captured as detached declarative data using the same conservative data rules in Section 10. Semantic validity remains M7 authority; M11 only ensures a safe exact transport snapshot.

### 5.2 `contract-attacks` mode

The incoming generator request MUST be a non-Proxy local plain record containing exactly these own data properties:

```js
{
  contract,
  input,
  expectedOutput,
  instructions
}
```

No extra string keys, symbol keys, accessors, or inherited authority are permitted.

The adapter captures:

```js
input = {
  contract,
  input,
  expectedOutput
}
```

The inner `input` name is intentionally the existing M8 case input. `instructions` is NOT duplicated inside this object; it is carried only in the top-level provider request field.

`contract`, case `input`, and `expectedOutput` MUST be captured as detached declarative data using Section 10. Semantic validity remains M8 authority.

### 5.3 Snapshot timing

The full mode-specific snapshot, including `instructions`, MUST be complete before `transport(request)` is invoked.

Mutation of the original generator request or any nested accepted value after generator invocation MUST NOT alter the request passed to `transport`.

## 6. Core-owned structured output format

The transport MUST NOT author or infer Gotcha's expected structured response schema.

M11 defines a core-owned, versioned declarative `outputFormat` for each mode. The adapter selects it solely from the already-validated `mode` and forwards a detached copy to `transport`.

The format is owned by Gotcha code, not caller transport code. A transport may translate this declarative description into provider-specific structured-output/schema configuration, but MUST NOT mutate Gotcha's semantic format authority.

Revision 2 provider requests carry:

```js
outputFormat = {
  version: 1,
  kind: "gotcha-output-format",
  mode,
  schema
}
```

`schema` MUST be the exact M11-maintained declarative description of the current accepted generator output shape for that mode:

- `quality-contract`: the current M7 Quality Contract draft generator output shape;
- `contract-attacks`: the current M8 contract-attack generator output shape.

The implementation MUST define these two schemas in Gotcha-owned code and version them with `outputFormat.version`.

M7/M8 remain the final semantic and authority validators. `outputFormat` exists to prevent provider transports from independently hardcoding a competing schema; it does not replace M7/M8 validation.

If a future M7/M8 generator output contract changes incompatibly, M11 MUST update the corresponding core-owned schema/version before claiming compatibility.

## 7. Exact provider request envelope

After successful synchronous invocation capture, the adapter constructs one fresh local plain-data request:

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

This envelope has exactly the seven named own enumerable data properties above, no symbol keys, and local `Object.prototype`.

`mode` and `model` come from the validated construction snapshot.

`instructions` MUST be the exact primitive instruction string supplied by the selected existing M7/M8 generator boundary. The adapter MUST NOT append, prepend, rewrite, summarize, or infer semantic instructions.

`outputFormat` is the core-owned format from Section 6.

`input` is the mode-specific detached snapshot from Section 5.

No evaluator callback, protection callback, credential, environment value, or executable authority may appear in this request.

## 8. Transport invocation semantics

For each valid generator invocation, the adapter MUST invoke the validated `transport` exactly once.

The invocation is exactly:

```js
transport(request)
```

with one argument: the completed provider request envelope.

The adapter MUST NOT perform:

- retries;
- fallback transports;
- model failover;
- timeout retries;
- duplicate probing calls;
- hidden health checks.

Retry/failover policy belongs entirely to caller-owned transport code outside the adapter.

A synchronous throw from this single transport call becomes the rejection reason of the generator's local native Promise. The adapter MUST NOT call transport again after that throw.

An accepted asynchronous transport rejection becomes the generator rejection reason. The adapter MUST NOT retry after that rejection.

## 9. Accepted transport return forms

`transport(request)` may return exactly one of two forms:

1. a synchronous provider response envelope satisfying Section 11; or
2. a genuine local native Promise whose fulfillment value is a provider response envelope satisfying Section 11.

The adapter MUST reject all other asynchronous/thenable forms with a local `TypeError` without executing arbitrary thenable assimilation:

- arbitrary objects/functions with a `then` property;
- Promise subclasses;
- cross-realm Promises;
- Proxy-wrapped Promises;
- provider-specific thenables.

Transport return classification MUST use captured/local trusted Promise-brand authority and descriptor-safe checks; it MUST NOT blindly apply `await`, `Promise.resolve`, or read an arbitrary inherited/accessor `then` property.

For an accepted local native Promise, the adapter observes it through captured trusted Promise authority so post-initialization mutation of ambient Promise hooks cannot introduce provider-controlled execution.

Regardless of transport return form, the public generator itself returns a genuine local native Promise.

## 10. Conservative declarative data rules

M11 snapshots use the same conservative AI-data philosophy already established by Gotcha.

Accepted values are recursively limited to:

- primitive strings;
- primitive booleans;
- `null`;
- finite primitive numbers;
- dense local arrays;
- local plain records whose prototype is exactly local `Object.prototype` or `null`.

Rejected anywhere in accepted transport data or captured invocation data:

- functions or callable objects;
- accessors;
- Proxies;
- cycles;
- repeated mutable object/array identity, including aliases reached by two paths;
- sparse arrays;
- symbol keys;
- extra executable descriptors;
- `undefined`;
- `bigint`;
- symbols as values;
- non-finite numbers;
- Date/Map/Set/Promise/Error/Buffer/ArrayBuffer/DataView/typed-array/MessagePort or similar intrinsic brands;
- custom-class instances.

Snapshotting MUST be descriptor-driven and MUST NOT execute user/provider getters or Proxy traps.

Repeated mutable identity is rejected rather than duplicated or preserved. Therefore every accepted output graph has a unique ownership tree.

## 11. Exact provider response envelope

The transport result MUST be validated as an outer envelope before `output` is read.

The response MUST be a non-Proxy local plain record whose prototype is exactly local `Object.prototype` or `null`.

It MUST contain exactly these three own string-keyed properties:

```js
{
  version,
  kind,
  output
}
```

It MUST contain no extra string keys, no symbol keys, no accessors, and no inherited response authority.

Validation order is normative:

1. reject Proxy/non-plain outer values without reading semantic properties;
2. capture all own property descriptors;
3. require exactly `version`, `kind`, and `output` as own data properties;
4. require `version === 1`;
5. require `kind === "gotcha-provider-response"`;
6. only then read/capture the `output` data-property value;
7. validate and detach `output` under Section 10.

Thus an accessor-backed `response.output` MUST reject without invoking its getter.

Provider metadata such as token usage, latency, request IDs, raw text, safety labels, or model traces is not allowed as extra response-envelope authority in Revision 2.

Consumers retain such metadata outside Gotcha's semantic generator return value.

## 12. Response ownership transfer

Before the generator Promise fulfills, the adapter MUST complete a detached snapshot of the accepted provider `output`.

No object/array identity from the transport response envelope or its `output` graph may be exposed to M7/M8.

The returned detached graph is mutable ordinary local data, not frozen. Mutation by M7/M8 or the caller after fulfillment MUST NOT mutate transport-owned data.

Conversely, mutation of the original transport envelope or original transport `output` after transport fulfillment MUST NOT alter the detached value observed by M7/M8.

Because repeated mutable identity is rejected under Section 10, alias preservation is not a permitted implementation choice.

The ownership boundary is therefore:

```text
transport-owned graph
  -> descriptor-safe validation
  -> complete detached unique tree
  -> Promise fulfillment
  -> M7/M8 semantic validation
```

## 13. Failure semantics

Construction errors are synchronous local `TypeError`s and perform no provider work.

Generator invocation always returns a genuine local native Promise.

The generator Promise rejects when:

- invocation envelope capture fails;
- transport throws;
- an accepted local native transport Promise rejects;
- transport returns a disallowed thenable/Promise form;
- the provider outer envelope is malformed;
- `output` violates Section 10 or cannot be detached safely.

The adapter MUST NOT translate failures into fake empty contracts, fake empty attack sets, fallback semantic output, or retries.

For transport synchronous throws and accepted native-Promise rejections, the original rejection/throw reason is propagated unchanged unless observing that value itself would violate a previously established native Promise integrity boundary; adapter-generated boundary failures are local `TypeError`s.

Semantically invalid but structurally safe `output` is returned to M7/M8, which reject it under their existing rules.

## 14. Prompt/instruction ownership

The adapter is a transport shim, not a second prompt-authority layer.

For each mode, `instructions` MUST be the exact instruction string already produced by the respective M7/M8 generator boundary.

The adapter may wrap that string in the provider request envelope but MUST NOT silently add provider-specific semantic rules.

Provider-specific formatting may translate `instructions` and `outputFormat` into an SDK request, but cannot change Gotcha task/schema authority while still claiming M11 compatibility.

## 15. Determinism and required proofs

All M11 tests use deterministic fake transports. No network access, API key, provider account, or model call is required by `npm test`.

Required proof includes:

- construction accepts only the exact three-field descriptor-safe record;
- construction rejects accessors, inherited authority, symbols, extras, Proxies, callable Proxies, empty/whitespace/non-canonical model strings, and invalid modes without side effects;
- construction performs zero transport calls and zero secret/environment reads;
- `quality-contract` invocation accepts exactly `task`, `examples`, `instructions` and sends exactly `{task, examples}` under request `input`;
- `contract-attacks` invocation accepts exactly `contract`, case `input`, `expectedOutput`, `instructions` and sends exactly those three semantic values under request `input`;
- `instructions` is not duplicated inside request `input`;
- both modes receive the correct core-owned versioned `outputFormat` and transports do not author that schema;
- full request snapshot completes before the one transport call;
- mutation of original invocation objects after generator invocation cannot alter transport-observed request authority;
- each valid invocation calls transport exactly once;
- synchronous transport throw produces one rejection and call count remains one;
- accepted native-Promise rejection produces one rejection and call count remains one;
- no adapter retry/fallback occurs;
- synchronous provider envelopes are accepted;
- genuine local native Promise responses are accepted;
- arbitrary thenables, Promise subclasses, cross-realm Promises, and Proxy Promises reject without executing attacker-controlled `then` accessors;
- outer provider response validation rejects accessors, symbols, extras, inherited authority, Proxies, and wrong literals before reading `output`;
- executable/non-data provider output rejects before M7/M8 semantic validation;
- retained transport envelope/output mutation after fulfillment cannot affect the returned detached snapshot;
- mutation of the returned snapshot cannot affect retained transport-owned data;
- repeated mutable identity in provider output rejects;
- M7/M8 still reject semantically invalid but structurally safe outputs exactly as before;
- both modes integrate with existing M7/M8 public APIs;
- package remains dependency-free;
- packed npm artifact exposes the adapter to an isolated external consumer.

## 16. First implementation slice

Slice A is intentionally narrow:

```text
createStructuredProviderAdapter()
  -> exact side-effect-free construction boundary
  -> exact mode-specific invocation capture
  -> core-owned outputFormat
  -> deterministic provider request envelope
  -> exactly-one caller-supplied transport call
  -> safe sync/local-native-Promise transport observation
  -> exact descriptor-safe provider response envelope
  -> detached declarative output
  -> M7/M8 integration tests
```

No provider-specific OpenAI/Anthropic/Gemini SDK helper is added in Slice A.

No implicit credential/environment support is added.

No adapter retry/failover layer is added.

## 17. Stopping rule

Before implementation, this architecture must receive a clean Codex review.

If review exposes ambiguity around prompt/schema authority, secrets, executable boundaries, mutation capture, Promise/thenable observation, call count, or response ownership, revise this spec first.

Only after the architecture is clean should Slice A implementation begin.
