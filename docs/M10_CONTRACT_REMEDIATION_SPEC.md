# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 16
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal and authority

M10 turns one confirmed M8 survivor into a human-authorized declarative protection and verifies an externally supplied improved evaluator against the exact bound M8 experiment.

AI never supplies executable evaluator code. Human confirmation is mandatory. The caller owns executable evaluator changes. Gotcha owns boundary validation, authority capture, replay ordering, artifact wire safety, and deterministic result semantics.

### Revision 16 simplification

M10 core no longer executes a protection-generator callback.

AI/model invocation is an adapter concern outside the trusted M10 core. The adapter may use any provider/runtime it chooses, then passes the resulting **declarative proposal data** into `draftContractProtection()`.

This is intentional architecture, not a missing feature:

```text
external model/provider adapter
  -> declarative proposal data
  -> draftContractProtection()
  -> human confirmation
  -> verifyContractProtection()
```

The trusted core therefore never runs model callback code, never needs an async global-prototype transaction, never assimilates model-returned thenables, and never depends on callback realm semantics for proposal generation.

Public APIs are exactly:

```js
draftContractProtection({ experiment, sourceAttackId, proposal })
confirmContractProtection({ draft, decision })
verifyContractProtection({ protection, evaluator, improvedEvaluator })
```

Only verification has executable callbacks:

```js
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

All three public APIs always return a genuine local native Promise.

## 2. Captured intrinsics and deterministic primitives

At module initialization Gotcha captures untampered references needed by this spec, including:

- `util.types.isProxy` and the intrinsic-brand probes named in Section 2.4;
- `Object.getOwnPropertyDescriptors`;
- `Object.getPrototypeOf`;
- `Object.isExtensible`;
- `Reflect.ownKeys`;
- `Reflect.apply`;
- `Array.isArray`;
- `String.prototype.trim`;
- `JSON.stringify` / `JSON.parse`;
- local `Object.prototype`, `Array.prototype`, and their original prototype-chain identities;
- local native `Promise` construction/brand machinery already used by M8.

Dynamic lookups through mutable user-visible prototypes are not authoritative.

### 2.1 `isNonEmptyStringV1(value)`

Exactly:

```text
typeof value === "string"
&& Reflect.apply(capturedStringTrim, value, []).length > 0
```

Whitespace-only strings reject. Accepted strings are preserved byte-for-byte; validation never trims or normalizes the stored value.

### 2.2 `isWireNumberV1(value)`

Exactly:

```text
typeof value === "number"
Number.isFinite(value) === true
Object.is(value, -0) === false
```

Every serialized non-literal numeric field uses this rule. Literal `version: 1` is validated as the literal value.

### 2.3 `isAcceptedEvaluatorV1(value)`

An evaluator is accepted iff:

```text
typeof value === "function"
captured util.types.isProxy(value) === false
```

No realm/function-kind restriction is imposed on evaluators. M8 remains responsible for evaluator execution and callback-surface safety.

### 2.4 `isForbiddenIntrinsicBrandV1(value)`

Before any non-array object is treated as a V1 data/schema record, Gotcha runs captured side-effect-free Node brand probes and rejects any positive intrinsic/exotic brand.

The V1 rejection set includes at minimum all available probes for:

```text
Date, RegExp, Map, Set, WeakMap, WeakSet,
Promise, native Error objects,
ArrayBuffer, SharedArrayBuffer, DataView, typed arrays,
boxed String/Number/Boolean/BigInt/Symbol values,
arguments objects, generator objects, module namespace objects,
map/set iterators, KeyObject/External values, and Buffer.
```

`util.types.isProxy` is checked first.

This check is performed **before** prototype normalization/copying. A prototype-rewritten exotic such as `Object.setPrototypeOf(new Date(), Object.prototype)` still rejects because its Date brand remains observable to the captured brand probe.

For host objects for which Node exposes no positive intrinsic-brand probe, V1 authority is defined by the exact current prototype/descriptor data boundary below; hidden host semantics are not preserved or relied upon.

### 2.5 `isExactRecordV1(value, exactKeys)`

A local schema record passes only when all are true:

1. non-null object and not an Array;
2. captured Proxy probe is false;
3. `isForbiddenIntrinsicBrandV1(value) === false`;
4. captured prototype is exactly Gotcha's local `Object.prototype`;
5. captured own keys contain exactly `exactKeys`, with no symbols, omissions, or extras;
6. every required key is an enumerable own data property;
7. accessors and non-enumerable schema fields reject;
8. semantic values are read only from captured own-property descriptors.

Source own-key insertion order does not affect acceptance. When Gotcha normalizes/builds a record, it creates properties in the canonical order shown by that record's schema in this document.

### 2.6 `isExactArrayV1(value)`

A local schema array passes only when all are true:

1. captured Proxy probe is false;
2. captured `Array.isArray(value) === true`;
3. captured prototype is exactly Gotcha's local `Array.prototype`;
4. own keys are exactly canonical indices `0..length-1` plus `"length"`;
5. every index is an enumerable own data property;
6. there are no holes, symbols, accessors, or extra named keys;
7. `length` has ordinary array-length descriptor semantics.

Schema-array element order remains semantically authoritative where this spec says so.

### 2.7 `isWireValueV1(value)`

Allowed scalars are `null`, string, boolean, and `isWireNumberV1` numbers.

Allowed Arrays are exact dense local arrays containing recursively allowed values.

Allowed Objects must:

- pass Proxy and forbidden-intrinsic-brand rejection;
- have exactly local `Object.prototype`;
- have only enumerable string own data properties;
- contain recursively allowed values.

Traversal uses one identity set for the complete value. Repeated Object/Array identity and cycles reject.

Therefore V1 rejects `undefined`, bigint, symbols, functions, accessors, null/custom/cross-realm prototypes, sparse arrays, repeated identity, cycles, intrinsic/exotic brands, non-finite numbers, and `-0`.

### 2.8 `isTreeGraphV1(root)`

Traverse every Object/Array reachable from `root` with one identity set. Each reachable identity must occur at exactly one path. Any repeated identity or cycle rejects.

This applies to the complete replayable experiment and to every complete draft/confirmed/rejected artifact.

Thus aliases such as:

```text
experiment.case.input.a === experiment.case.expectedOutput.b
artifact.rule === artifact.experiment.attacks[0].rule
```

are forbidden.

### 2.9 `deepOwnedSnapshotV1(value)`

A deep owned snapshot shares no mutable Object/Array reference with its source graph, preserves exact accepted V1 scalar/data semantics, constructs schema properties in canonical schema order, and satisfies `isTreeGraphV1` whenever the source is required to be a tree.

## 3. Invocation-time authority capture

### 3.1 `captureInvocationV1(options, callbackKeys)`

Public arguments become authoritative synchronously at invocation time, before the returned Promise is handed back.

Capture is descriptor-only and does not execute getters/setters or Proxy traps.

For every container encountered before copying:

1. Proxy => capture-failure sentinel;
2. Array => source must satisfy the source-side Array prototype/descriptor rules;
3. non-Array object => run `isForbiddenIntrinsicBrandV1` first, then require local `Object.prototype` and data descriptors;
4. accessors, symbol keys, malformed dense-array descriptors, or unreadable descriptor state => capture-failure sentinel;
5. only after those rejection-relevant facts pass may data be copied into fresh local canonical containers.

Callback slots named by `callbackKeys` are captured by function identity and not traversed.

Any capture failure is stored internally. The API still returns its native Promise; semantic validation later rejects that Promise with `TypeError`. No public validation error is thrown synchronously.

Caller mutation immediately after invocation cannot change the values/callback identities used by that invocation.

Exact invocation captures are:

```text
draft:   captureInvocationV1(options, [])
confirm: captureInvocationV1(options, [])
verify:  captureInvocationV1(options, ["evaluator", "improvedEvaluator"])
```

## 4. Prototype baseline for wire operations

M10 does not attempt to transactionally mutate/restore global prototypes.

Before every M10/M8 experiment or artifact JSON wire probe, Gotcha checks the captured local prototype baseline:

```text
Object.getPrototypeOf(Object.prototype) === captured original (null)
Object.getPrototypeOf(Array.prototype) === captured local Object.prototype
```

and verifies that neither local `Object.prototype` nor local `Array.prototype` has an own `toJSON` property.

If this baseline is not exact, JSON wire probing is not executed:

- M8 experiment emission uses the non-replayable variant;
- M10 draft/confirmation artifact completion rejects with `TypeError`.

Gotcha never invokes an inherited prototype `toJSON` during an accepted wire probe.

Because M10 no longer executes proposal-generator code, it introduces no async period in which its own proposal-generation callback can globally mutate these prototypes.

## 5. Exact confirmed contract

Embedded contract is exactly, in canonical build order:

```js
{
  version: 1,
  status: "confirmed",
  task,
  rules
}
```

`task` satisfies `isNonEmptyStringV1`.

`rules` is an exact array with `1..MAX_RULES` records exactly:

```js
{ id, statement, kind, severity }
```

`id` and `statement` are non-empty. Rule IDs are unique. `kind` is one of `required | forbidden | conditional`; `severity` is one of `critical | major | minor`.

## 6. M8 pre-callback capture and experiment emission

Before the first evaluator or attack-generator callback of a `runContractAttacks()` attempt, M8 MUST:

1. validate the confirmed contract;
2. determine structural V1 eligibility of original pre-canonicalization `input` and `expectedOutput`, including intrinsic-brand/prototype rules;
3. capture independently owned canonical evaluator-case snapshots;
4. freeze that eligibility decision and snapshots for the run.

Later caller/callback mutation cannot change that run's case authority.

Each retained attack output is independently snapshotted at retention time.

Every successful M8 run emits exactly one own `experiment` field.

### 6.1 Non-replayable experiment

If any eligibility, tree, numeric, prototype-baseline, or wire-safety check fails:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: false,
  task,
  reason: { code: "EXPERIMENT_NOT_WIRE_REPLAYABLE" }
}
```

Drafting rejects this variant before processing a proposal.

### 6.2 Replayable experiment

Exactly:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: true,
  task,
  contract,
  case: {
    input,
    expectedOutput,
    replay: {
      version: 1,
      kind: "m8-evaluator-case",
      strategy: "json-wire-v1"
    }
  },
  attacks,
  baseline: {
    outcomes,
    survivorOrderIds,
    topFindingId
  }
}
```

Exact keys are those shown. `task === contract.task`. The complete experiment satisfies `isTreeGraphV1`.

After construction, Gotcha checks Section 4 then probes:

```js
{ experiment: completeCandidateExperiment }
```

with captured JSON intrinsics.

Replayable requires successful stringify/parse, complete parsed revalidation, parsed whole-experiment tree validity, deep equality of case/attack payloads, exact signed-zero-safe numerics, and every cross-field invariant.

## 7. Exact attack and baseline schemas

Each attack is exactly:

```js
{
  id,
  ruleId,
  rule: { id, statement, kind, severity },
  type,
  description,
  rationale,
  output,
  severity,
  realism,
  subtlety,
  novelty,
  fixability
}
```

Attack count is `0..20`. `id`, `ruleId`, `type`, `description`, and `rationale` are non-empty. Attack IDs are unique.

`realism`, `subtlety`, `novelty`, `fixability` each satisfy `isWireNumberV1` and `0 <= value <= 1`.

`attack.severity` is exactly:

```text
critical -> 1.0
major    -> 0.7
minor    -> 0.4
```

The embedded attack rule exactly matches the active contract rule and `attack.ruleId === attack.rule.id`.

`output` passes current M8 AI-data validation plus `isWireValueV1`, differs from `expectedOutput`, and retained attacks contain no same-rule/deep-equal duplicate.

Each baseline outcome is exactly:

```js
{ attackId, evaluatorResult: "PASS" | "FAIL", survived: boolean }
```

`outcomes[i].attackId === attacks[i].id`; there is exactly one outcome per attack. `evaluatorResult === "PASS"` iff `survived === true`.

`survivorOrderIds` contains exactly survived IDs in M8 rank order. `topFindingId` is first survivor ID or `null`.

## 8. Exact declarative proposal boundary

`draftContractProtection()` accepts proposal data, not executable proposal-generation logic.

Proposal is exactly:

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

Every shown string satisfies `isNonEmptyStringV1`.

Authority bindings are exact:

```text
proposal.task === experiment.task
proposal.sourceAttackId === requested sourceAttackId
proposal.ruleId === selectedAttack.ruleId
```

Extra fields, executable values, accessors, Proxies, exotic brands, custom/cross-realm prototypes, and aliases reject.

The external model/provider adapter is responsible only for obtaining this declarative value. It has no authority to alter the contract, selected source, rule, baseline history, verification evaluator, or human confirmation result.

## 9. Public completion contract

All three APIs always return a genuine local native Promise from captured local Promise machinery.

Boundary/schema/value/status/authority errors reject with `TypeError`. Error text is non-authoritative.

There is no proposal-generator throw/rejection channel in M10 core because M10 core executes no proposal generator.

Evaluator failures classified in Section 16 resolve semantic verification results and do not reject.

## 10. Drafting algorithm

The drafting Promise continuation performs exactly:

1. validate invocation capture;
2. validate replayable experiment completely, including whole-experiment tree semantics;
3. require `sourceAttackId` to identify exactly one original baseline survivor;
4. create `experimentAuthority = deepOwnedSnapshotV1(experiment)`;
5. validate the captured declarative proposal against Section 8;
6. construct a fresh local draft from independent snapshots of experiment authority and proposal text, allocating every artifact container independently;
7. set `status: "draft"`;
8. validate complete artifact and whole-artifact tree semantics;
9. perform Section 13 completed-artifact wire probe;
10. resolve the draft.

No model/provider/user callback executes in this operation.

## 11. Draft, decision, confirmation, rejection

Artifact shape is exactly:

```js
{
  version: 1,
  kind: "contract-protection",
  status: "draft" | "confirmed" | "rejected",
  task,
  experiment,
  source: { attackId, ruleId },
  rule: { id, statement, kind, severity },
  protection: { statement, rationale }
}
```

For every status, `task`, `source.attackId`, `source.ruleId`, `rule.id`, `rule.statement`, `protection.statement`, and `protection.rationale` satisfy `isNonEmptyStringV1`.

`rule.kind` and `rule.severity` satisfy exact contract-rule enums.

Complete artifact must satisfy `isTreeGraphV1` before return and whenever accepted by a later API.

`draftContractProtection()` resolves only `status: "draft"`.

`confirmContractProtection()` accepts only `status: "draft"`.

Decisions are exactly:

```js
{ type: "accept" }
{ type: "edit", statement }
{ type: "reject" }
```

`edit.statement` is non-empty and changes only `protection.statement`.

Exact mapping:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Confirmation outputs are deep-owned tree snapshots sharing no mutable nested reference with captured draft or decision.

Cross-field invariants at draft/confirmation/verification:

```text
task === experiment.task === experiment.contract.task
source.attackId -> exactly one bound original survivor
source.ruleId === selectedAttack.ruleId
rule.id === source.ruleId === selectedAttack.rule.id
rule statement/kind/severity === selected attack rule snapshot
selected attack rule snapshot === active embedded contract rule
```

## 12. Canonical object construction order

Gotcha-created records use exactly the key order shown in their schemas in this document.

This includes experiment, contract, rules, attacks, outcomes, proposal normalization, protection artifacts, source/rule/protection nested records, normalized replay payloads, and verification results.

Caller/reloaded input key order is not authority and does not alter acceptance when the exact key set/descriptors are otherwise valid; normalization/building establishes canonical output order.

Array order remains semantic according to Sections 7, 17, 18, and 21.

## 13. Completed-artifact wire safety

Every draft/confirmed/rejected artifact is wire-probed after final text/status is known and immediately before its public Promise resolves.

Before serialization:

1. complete artifact satisfies `isTreeGraphV1`;
2. Section 4 prototype baseline passes.

Using captured JSON intrinsics, Gotcha stringifies/parses the exact completed artifact.

Resolution requires:

1. stringify succeeds, including runtime nesting/string-size limits;
2. parse succeeds;
3. parsed artifact fully revalidates for exact status/schemas;
4. complete parsed artifact satisfies `isTreeGraphV1`;
5. parsed experiment remains a valid replayable experiment;
6. cross-field bindings remain exact;
7. parsed protection strings equal pre-probe strings byte-for-byte.

Any failure rejects drafting/confirmation with `TypeError`.

This probe occurs after proposal text and after every accept/edit/reject construction.

## 14. Verification authority snapshot

Verification accepts only `status: "confirmed"` artifacts satisfying Sections 11–13.

Invocation capture fixes caller protection/evaluator identities before Promise return.

Before first baseline callback, verification creates one independent `verificationAuthority`. Baseline and improved phases derive every case, attack, result-protection, baseline-history, and source value only from that authority.

No caller object is reread after invocation and no baseline callback can alter Phase B authority.

## 15. M8 replay projection

For each bound attack:

```js
{
  id: attack.id,
  ruleId: attack.ruleId,
  type: attack.type,
  description: attack.description,
  rationale: attack.rationale,
  mutatedOutput: attack.output,
  scores: {
    realism: attack.realism,
    subtlety: attack.subtlety,
    novelty: attack.novelty,
    fixability: attack.fixability
  }
}
```

Replay generator returns exactly `{ version: 1, task: experiment.task, attacks: projectedAttacks }` and satisfies current M8 generator validation. M8 recomputes severity from bound rule authority.

## 16. Exact evaluator failure classification to state mapping

M8 exposes stable classification:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

`returned-false` is failure only in positive control; an attack callback returning `false` is a normal caught result.

Baseline mapping:

```text
positive-control + returned-false -> baseline-positive-control-failed
positive-control + threw          -> baseline-execution-failed
positive-control + non-boolean    -> baseline-execution-failed
attack-evaluation + threw         -> baseline-execution-failed
attack-evaluation + non-boolean   -> baseline-execution-failed
```

Baseline execution failure during positive control has `baselinePositiveControlPassed = null`; attack-evaluation failure after passed control has `true`.

Improved mapping:

```text
positive-control + returned-false -> improved-positive-control-failed
positive-control + threw          -> improved-execution-failed
positive-control + non-boolean    -> improved-execution-failed
attack-evaluation + threw         -> improved-execution-failed
attack-evaluation + non-boolean   -> improved-execution-failed
```

Improved execution failure during positive control has `improvedPositiveControlPassed = null`; attack-evaluation failure after passed control has `true`.

Every classified failure resolves verification with the corresponding uniform partial result.

## 17. Strict baseline identity gate

Baseline runs first. Improved evaluation never starts until baseline positive control passes, baseline attack replay completes, and replay exactly matches bound historical identity.

Historical identity requires every per-attack classification, survivor rank order, and top finding to match.

`baselineMismatchAttackIds` contains exactly IDs whose replayed `evaluatorResult` or `survived` differs from bound outcome, in bound attack order. Pure ranking/top-finding mismatch with identical per-attack classifications yields `[]`.

## 18. Exact normalized replay payload

Whenever replay completes, `baseline` or `after` is exactly:

```js
{
  outcomes: [
    { attackId, evaluatorResult: "PASS" | "FAIL", survived: boolean }
  ],
  survivorOrderIds: [],
  topFindingId: null
}
```

Outcome order is bound attack order. Survivor order is M8 rank order. Payloads are independent snapshots and never expose full mutable M8 results.

## 19. Uniform verification result

Every semantic result has exactly:

```js
{
  version,
  kind,
  state,
  verificationPassed,
  task,
  sourceAttackId,
  sourceRuleId,
  protection,
  baselinePositiveControlPassed,
  improvedPositiveControlPassed,
  baseline,
  after,
  baselineMismatchAttackIds,
  eliminatedAttackIds,
  regressionAttackIds,
  sourceFindingCaught,
  improvement,
  failureReasons
}
```

Fixed:

```text
version = 1
kind = "contract-protection-verification"
```

`task`, `sourceAttackId`, `sourceRuleId`, `protection.statement`, and `protection.rationale` are non-empty.

`protection` is an independent exact `{ statement, rationale }` snapshot. No field is omitted and `undefined` is never used.

### 19.1 Partial states

| State | baseline PC | improved PC | baseline | after | mismatch IDs | source caught | improvement | failureReasons |
|---|---|---|---|---|---|---|---|---|
| `baseline-positive-control-failed` | `false` | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-positive-control-failed"]` |
| `baseline-execution-failed` | Section 16 (`null` or `true`) | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-execution-failed"]` |
| `baseline-mismatch` | `true` | `null` | completed | `null` | Section 17 | `false` | `null` | `["baseline-mismatch"]` |
| `improved-positive-control-failed` | `true` | `false` | completed | `null` | `[]` | `false` | `null` | `["improved-positive-control-failed"]` |
| `improved-execution-failed` | `true` | Section 16 (`null` or `true`) | completed | `null` | `[]` | `false` | `null` | `["improved-execution-failed"]` |

For every partial state:

```text
verificationPassed = false
eliminatedAttackIds = []
regressionAttackIds = []
```

## 20. Complete replay semantics

On complete improved replay:

```text
sourceFindingCaught = source after-outcome survived === false
eliminated = baseline survived -> after caught
regression = baseline caught -> after survived
improvement = baseline.survivorOrderIds.length - after.survivorOrderIds.length
```

Diagnostic ID arrays use bound attack order.

State precedence:

1. any regression -> `regression-detected`, failed;
2. else source survives -> `source-finding-still-survives`, failed;
3. else -> `verified`, passed.

Exact `failureReasons`:

```text
regression + source survives -> ["regression-detected", "source-finding-still-survives"]
regression + source caught   -> ["regression-detected"]
no regression + survives    -> ["source-finding-still-survives"]
no regression + caught      -> []
```

`sourceFindingCaught` reflects only selected-source after classification and may be `true` while verification fails because another attack regressed.

## 21. Ordering

`baselineMismatchAttackIds`, `eliminatedAttackIds`, `regressionAttackIds`, experiment baseline outcomes, and normalized replay outcomes use bound attack order.

`survivorOrderIds` uses M8 rank order.

`failureReasons` uses Sections 19–20 order and contains no duplicates.

Record property construction order follows Section 12.

## 22. Required proof matrix

Implementation is not complete until tests prove at least:

- `isNonEmptyStringV1` uses captured trim semantics; replacing `String.prototype.trim` cannot make whitespace-only authority pass;
- invocation capture rejects Proxies/accessors/cross-realm/null/custom-prototype containers before copying;
- prototype-rewritten intrinsic exotics such as Date/Map/typed-array values reject via captured brand probes before normalization;
- immediate caller mutation after API return cannot replace experiment/proposal/draft/protection/decision/evaluator authority;
- all public validation failures remain asynchronous native-Promise rejections;
- M10 drafting executes no proposal/model callback and has no generator thenable/reentrancy/prototype-guard lifetime;
- exact proposal schema/authority binding rejects extra/executable/rebound data;
- external adapter output must cross the local declarative-data boundary before M10 authority is established;
- complete experiment tree traversal rejects aliases/cycles across all experiment fields;
- complete protection artifact tree traversal rejects top-level-to-nested aliases before and after JSON round trip;
- JSON reload cannot de-alias accepted experiment/artifact authority because accepted graphs are trees;
- `-0` rejects in case/output values and every score field;
- pre-callback M8 case eligibility is frozen;
- prototype baseline checks include prototype-chain identity and own `toJSON`, and wire probing fails closed when baseline differs;
- canonical Gotcha-built record key order matches Section 12 and source key insertion order cannot alter normalized output;
- artifact protection statement/rationale reject empty/whitespace-only values for every status and reconstructed artifact;
- drafting resolves only draft; confirmation accepts only draft and maps accept/edit/reject exactly;
- every draft/confirmed/rejected artifact is probed after final text/status and whole-artifact tree validation;
- huge/escape-heavy proposal/edit text that cannot stringify rejects rather than returning an unserializable artifact;
- baseline/improved evaluator phase/reason mappings are exact;
- baseline identity gates improved execution;
- all partial results have exact field values;
- simultaneous regression + source survival reports both reasons in canonical order;
- existing successful M8 behavior remains unchanged except additive experiment emission.

## 23. Scope and stopping rule

Expected implementation touches:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

No callback-realm/prototype-guard helper is required by Revision 16.

Provider/model adapters remain outside the trusted M10 core and may be added later without changing the artifact/verification authority model.

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

M10 is implementation-ready only when a fresh exact-head architecture review finds no concrete contradiction or remaining V1 implementation-choice ambiguity in proposal-data authority, invocation capture, intrinsic-brand handling, experiment/artifact tree semantics, prototype-baseline wire safety, ownership, replay ordering, evaluator-state mapping, or result semantics.

Out of scope: provider adapters, lossless arbitrary graph/prototype serialization, cryptographic provenance, dashboards, production-model execution inside M10 core, AI-generated executable code, automatic patching, universal future-attack proof, and unrelated engine redesign.
