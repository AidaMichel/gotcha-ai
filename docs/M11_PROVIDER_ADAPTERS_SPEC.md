# M11 — Provider Adapter Boundary

Status: Architecture Draft — Revision 1
Milestone: 11
Branch: `milestone-11-provider-adapters`
Base: `main@0c3287c4ea5ef181db564eb371e4f2b7b5d8fa49`

## 1. Goal

M11 makes Gotcha easier to connect to real model providers without moving provider credentials, HTTP transport, retries, model selection, or executable evaluator changes into the deterministic quality core.

The milestone standardizes a small provider-adapter boundary that can serve both existing AI-assisted seams:

- Quality Contract drafting (`draftQualityContract` generator input/output)
- confirmed-contract attack generation (`runContractAttacks` generator input/output)

M10 remediation remains declarative in core. A future remediation-proposal provider adapter may use the same adapter primitives, but M11 Revision 1 does not add provider execution inside `draftContractProtection()`.

## 2. Product rule

Provider adapters are convenience infrastructure, not semantic authority.

Gotcha core remains authoritative for:

- task/contract authority;
- schema validation;
- evidence and rule binding;
- attack retention/ranking;
- replayability;
- human confirmation;
- remediation verification.

The adapter/caller owns:

- provider and model choice;
- API credentials;
- HTTP client or SDK;
- request authentication;
- timeout/retry policy;
- provider availability and billing;
- mapping provider responses into plain declarative JSON data.

No provider adapter may make an unconfirmed draft authoritative, generate executable evaluator code, bypass existing core validation, or silently mutate input authority.

## 3. No built-in secrets or network authority

The `gotcha-ai` package MUST NOT:

- read `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or any other secret implicitly;
- persist credentials;
- ship a hidden hosted endpoint;
- make network requests merely because an adapter is constructed;
- send telemetry or provider prompts anywhere other than the caller-supplied transport.

Revision 1 keeps the package dependency-free. Provider SDK dependencies remain in consumer applications.

## 4. Public API

Revision 1 adds exactly one provider-neutral factory:

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

Exact construction fields:

```text
transport -> required function
model     -> required non-empty string
mode      -> "quality-contract" | "contract-attacks"
```

The factory returns one async callable generator compatible with the selected existing Gotcha API:

```js
const generator = createStructuredProviderAdapter(...);
```

For `mode: "quality-contract"`, the returned generator accepts the current `draftQualityContract()` generator request.

For `mode: "contract-attacks"`, it accepts the current `runContractAttacks()` generator request.

No new core semantic schema is introduced. Existing M7/M8 validators remain the final authority over provider output.

## 5. Transport contract

The caller supplies:

```js
async function transport(request) {
  // Call any provider/SDK here.
  // Return provider-neutral structured data.
}
```

The adapter invokes transport with a fresh plain-data request:

```js
{
  version: 1,
  kind: "gotcha-provider-request",
  mode,
  model,
  instructions,
  input
}
```

`input` is a deep-owned plain-data snapshot of the existing generator request fields needed by that mode. The adapter MUST NOT pass mutable core-owned request objects by reference.

The adapter does not invent prompts independently of the current core generator instructions. It forwards the exact instruction text supplied by the existing M7/M8 generator boundary.

## 6. Provider response contract

The transport resolves to exactly:

```js
{
  version: 1,
  kind: "gotcha-provider-response",
  output
}
```

`output` is declarative plain data only.

The adapter returns a deep-owned copy of `output` to the calling M7/M8 API. M7/M8 then apply their existing exact schema/authority validation.

Provider metadata such as token usage, latency, request IDs, raw text, safety labels, or model traces is not forwarded into semantic generator output in Revision 1.

If consumers need such metadata they retain it outside Gotcha's semantic generator return value.

## 7. Failure semantics

Construction errors are synchronous `TypeError`s because the adapter factory itself does not execute provider work.

Generator invocation always returns a genuine local native Promise.

The Promise rejects when:

- transport throws or rejects;
- transport returns a malformed provider envelope;
- `output` contains executable values, accessors, Proxies, cycles, unsupported intrinsic brands, or otherwise cannot be copied as plain provider data.

The adapter does not translate provider failures into fake empty contracts/attacks.

The existing M7/M8 API remains responsible for rejecting semantically invalid but structurally copyable generator output.

## 8. Data and authority boundary

Revision 1 provider data uses the same conservative AI-data philosophy already established by Gotcha:

- strings, booleans, null, finite numbers;
- dense arrays;
- plain local records;
- no functions in provider response data;
- no accessors;
- no Proxies;
- no cycles or repeated mutable identity;
- no Date/Map/Set/Promise/Error/Buffer/typed-array or similar intrinsic brands.

The adapter captures generator invocation input before awaiting transport. Caller mutation after invocation cannot alter the provider request sent by that invocation.

Transport receives no evaluator callback and no executable authority.

## 9. Prompt/instruction ownership

The adapter is a transport shim, not a second prompt-authority layer.

For each mode, `instructions` MUST be the exact instruction string already produced by the respective M7/M8 generator boundary.

The adapter may wrap that instruction string in a provider request envelope but MUST NOT silently append provider-specific semantic rules that alter Gotcha's expected schema or task authority.

A later provider-specific helper may offer formatting functions, but semantic instructions remain generated by Gotcha core.

## 10. Determinism and testability

All M11 tests use deterministic fake transports. No network access, API key, provider account, or model call is required by `npm test`.

Required proof includes:

- factory exact option validation;
- both modes produce generators compatible with existing M7/M8 public APIs;
- transport receives a deep-owned request snapshot;
- mutation after generator invocation cannot alter sent authority;
- malformed provider envelopes reject;
- transport throw/rejection propagates as rejection and never becomes fake semantic output;
- executable/non-data provider output rejects before M7/M8 semantic validation;
- M7/M8 still reject semantically invalid structured outputs exactly as before;
- no secret environment variables are read;
- no network request occurs at adapter construction;
- package remains dependency-free;
- packed npm artifact exposes the adapter to an external consumer.

## 11. First implementation slice

Slice A is intentionally narrow:

```text
createStructuredProviderAdapter()
  -> exact construction boundary
  -> deterministic provider request envelope
  -> caller-supplied transport
  -> exact provider response envelope
  -> deep-owned declarative output
  -> M7/M8 integration tests
```

No provider-specific OpenAI/Anthropic/Gemini SDK helper is added in Slice A.

## 12. Stopping rule

Before implementation, this architecture must receive a clean Codex review.

If review exposes ambiguity around prompt authority, secrets, executable boundaries, mutation capture, or response ownership, revise this spec first.

Only after the architecture is clean should Slice A implementation begin.