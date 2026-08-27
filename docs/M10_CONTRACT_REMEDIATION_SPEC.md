# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 19
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal and authority

M10 turns one confirmed M8 survivor into a human-authorized declarative protection and verifies an externally supplied improved evaluator against the exact bound M8 experiment.

AI never supplies executable evaluator code. Human confirmation is mandatory. The caller owns executable evaluator changes. Gotcha owns boundary validation, authority capture, replay ordering, artifact wire safety, and deterministic result semantics.

M10 core does **not** execute a protection-generator callback. Model/provider execution is an adapter concern outside the trusted core:

```text
external model/provider adapter
  -> declarative proposal data
  -> draftContractProtection()
  -> human confirmation
  -> verifyContractProtection()
```

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

At module initialization Gotcha captures the exact references used by this specification:

- `util.types.isProxy`;
- the exact mandatory brand probes in Section 2.4;
- `Buffer.isBuffer`;
- `Object.getOwnPropertyDescriptors`;
- `Object.getPrototypeOf`;
- `Object.isExtensible`;
- `Object.is`;
- `Number.isFinite`;
- `Reflect.ownKeys`;
- `Reflect.apply`;
- `Array.isArray`;
- `String.prototype.trim`;
- `JSON.stringify` and `JSON.parse`;
- local `Object.prototype`, local `Array.prototype`, and their original prototype-chain identities;
- local native `Promise` construction/brand machinery already used by M8.

Dynamic lookup through mutable user-visible globals/prototypes is never authoritative.

### 2.1 `isNonEmptyStringV1(value)`

Exactly:

```text
typeof value === "string"
&& capturedReflectApply(capturedStringTrim, value, []).length > 0
```

Whitespace-only strings reject. Accepted strings are preserved byte-for-byte.

### 2.2 `isWireNumberV1(value)`

Exactly:

```text
typeof value === "number"
&& capturedNumberIsFinite(value) === true
&& capturedObjectIs(value, -0) === false
```

Every serialized non-literal numeric field uses this rule. Literal `version: 1` is validated as the literal value.

### 2.3 `isAcceptedEvaluatorV1(value)`

Exactly:

```text
typeof value === "function"
&& capturedIsProxy(value) === false
```

No realm/function-kind restriction is imposed. M8 owns evaluator execution safety.

### 2.4 `isForbiddenIntrinsicBrandV1(value)`

The V1 forbidden-brand decision uses **only** the following mandatory captured probes, in this exact list. A positive result from any one rejects the value:

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

`capturedIsProxy` is checked before this brand set.

No additional runtime probe may widen or narrow V1 acceptance. Newly added Node probes are ignored by Revision 19 unless a later spec revision explicitly adds them.

If **any** mandatory probe named above is unavailable or is not callable at module initialization, Gotcha marks the Revision-19 wire-authority capability unavailable for that process. Deterministic fallback is:

- M8 emits only the non-replayable experiment variant for M10 purposes;
- every M10 public API returns its normal local native Promise and asynchronously rejects it with `TypeError` before semantic processing.

This is the only missing-probe fallback; implementations may not silently skip a mandatory probe.

Brand probing occurs before prototype normalization/copying. Therefore a covered intrinsic whose prototype was rewritten still rejects.

Objects not identified by this exact mandatory set are governed only by the exact prototype/descriptor/tree rules below.

### 2.5 `isExactRecordV1(value, exactKeys)`

A local schema record passes only when all are true:

1. value is a non-null object and not an Array;
2. captured Proxy probe is false;
3. `isForbiddenIntrinsicBrandV1(value) === false`;
4. captured prototype is exactly Gotcha local `Object.prototype`;
5. captured `Object.isExtensible(value) === true`;
6. captured `Reflect.ownKeys(value)` contains exactly `exactKeys`, with no symbols, omissions, or extras;
7. every required key is an enumerable own data property;
8. every required key descriptor is exactly `{ value: <captured value>, writable: true, enumerable: true, configurable: true }`;
9. accessors, non-enumerable fields, non-writable fields, non-configurable fields, sealed/frozen/non-extensible records, and any other descriptor surface reject;
10. semantic values are read only from captured own-property descriptors.

Source insertion order is not authority for schema records. Gotcha-created schema records define properties in the canonical schema order shown in this document and create every property with ordinary mutable data-property attributes `writable: true`, `enumerable: true`, `configurable: true`; the completed record remains extensible.

This exact surface applies equally to direct caller/reconstructed schema records, Gotcha-created snapshots/artifacts/results, and JSON-reloaded schema records. V1 never preserves stricter source descriptors because JSON reload would erase them.

### 2.6 `isExactArrayV1(value)`

A local schema array passes only when all are true:

1. captured Proxy probe is false;
2. captured `Array.isArray(value) === true`;
3. captured prototype is exactly Gotcha local `Array.prototype`;
4. captured `Object.isExtensible(value) === true`;
5. own keys are exactly canonical indices `0..length-1` plus `"length"`;
6. every index is an enumerable own data property whose descriptor is exactly `{ value: <captured value>, writable: true, enumerable: true, configurable: true }`;
7. no holes, symbols, accessors, extra named keys, non-writable index properties, non-configurable index properties, or non-extensible Arrays exist;
8. the own `length` descriptor is exactly:

```js
{
  value: <the array's integer length>,
  writable: true,
  enumerable: false,
  configurable: false
}
```

Therefore frozen/sealed/non-extensible Arrays and Arrays with non-ordinary index descriptors are not accepted V1 schema/wire Arrays even if dense.

Gotcha-created Arrays use ordinary Array construction so their index descriptors and extensibility exactly match this rule. JSON-reloaded Arrays must revalidate to the same surface.

Array element order remains semantically authoritative wherever this spec assigns an order.

### 2.7 Schema-less wire-record key order and descriptor surface

Objects inside `case.input`, `case.expectedOutput`, and `attack.output` are schema-less evaluator-facing wire records.

For each accepted schema-less record:

1. capture `Reflect.ownKeys(record)` once after Proxy/brand/prototype checks;
2. require captured prototype exactly local `Object.prototype` and captured `Object.isExtensible(record) === true`;
3. require every captured key to be a string naming an own data property;
4. require every such property descriptor exactly `{ value: <captured value>, writable: true, enumerable: true, configurable: true }`;
5. preserve that captured key sequence exactly as the record's V1 evaluator-facing key order;
6. when deep-snapshotting/normalizing the record, define properties in exactly that captured sequence with the same ordinary mutable descriptor attributes;
7. never lexically sort, schema-sort, or otherwise reorder those keys;
8. wire revalidation after JSON parse must reproduce both the same `Reflect.ownKeys` string-key sequence and the same writable/enumerable/configurable descriptor surface;
9. sealed/frozen/non-extensible records, accessors, symbol keys, non-enumerable keys, non-writable properties, or non-configurable properties reject before snapshot normalization.

This key sequence is part of replay semantics because evaluators may observe `Object.keys`/`Reflect.ownKeys` order. The descriptor/extensibility surface is also fixed because direct snapshots and the supported JSON reload must expose the same mutation boundary.

Nested schema-less records apply this rule recursively and independently.

### 2.8 `isWireValueV1(value)`

Allowed scalars are `null`, string, boolean, and `isWireNumberV1` numbers.

Allowed Arrays are exact dense local Arrays satisfying the Section 2.6 prototype, extensibility, index-descriptor, and length-descriptor rules and containing recursively allowed values.

Allowed Objects must:

- pass Proxy and the exact Section 2.4 forbidden-brand set;
- have exactly local `Object.prototype`;
- be extensible;
- have only enumerable string own data properties whose descriptors are exactly writable/configurable/enumerable `true`;
- follow Section 2.7 key-order semantics;
- contain recursively allowed values.

Traversal uses one identity set for the complete value. Repeated Object/Array identity and cycles reject.

Therefore V1 rejects `undefined`, bigint, symbols, functions, accessors, null/custom/cross-realm prototypes, sparse/frozen/sealed/non-extensible arrays, non-ordinary array-index descriptors, non-extensible/sealed/frozen records, non-ordinary record descriptors, repeated identity, cycles, every Section 2.4 forbidden brand, non-finite numbers, and `-0`.

### 2.9 `isTreeGraphV1(root)`

Traverse every Object/Array reachable from `root` with one identity set. Each reachable identity must occur at exactly one path. Any repeated identity or cycle rejects.

This applies to:

- the complete replayable experiment;
- every complete draft/confirmed/rejected protection artifact;
- every complete verification result.

Aliases such as these are forbidden:

```text
experiment.case.input.a === experiment.case.expectedOutput.b
artifact.rule === artifact.experiment.attacks[0].rule
result.baselineMismatchAttackIds === result.eliminatedAttackIds
```

### 2.10 `deepOwnedSnapshotV1(value)`

A deep owned snapshot:

- shares no mutable Object/Array reference with its source graph;
- preserves exact accepted V1 scalar/data semantics;
- preserves Section 2.7 key order for schema-less wire records;
- constructs every schema-less record with exact ordinary mutable descriptors and extensibility from Section 2.7;
- constructs schema records in canonical schema order with exact ordinary mutable descriptors and extensibility from Section 2.5;
- constructs Arrays with exact ordinary mutable index descriptors, extensibility, and `length` descriptor from Section 2.6;
- satisfies `isTreeGraphV1` whenever the source is required to be a tree.

Snapshots never preserve source freezing/sealing/non-configurable/non-writable descriptor state because such source state is itself outside V1 acceptance.

### 2.11 `isM8AttackFilterEqualV1(a, b)`

This predicate is used **only** for M8 unchanged-output filtering and same-rule duplicate filtering when deciding which attacks may enter a replayable V1 experiment.

It intentionally matches current M8 deep-data equivalence rather than evaluator key-order observability:

- scalars compare by current M8 AI-data equality, with accepted V1 numeric inputs already excluding non-finite numbers and `-0`;
- Arrays compare recursively by length and index order;
- plain schema-less Objects compare recursively by own string-key **membership and corresponding values, ignoring object key insertion order**.

Therefore an object mutation that changes only schema-less object key insertion order is explicitly **not a distinct M8/V1 attack** and is filtered as unchanged/duplicate. Revision 19 does not expand M8 attack generation to retain order-only mutations.

For every attack that is retained because it differs by this predicate, the exact historical key order of its `output` remains replay authority under Section 2.7 and must be preserved exactly.

## 3. Invocation-time authority capture and exact public option schemas

### 3.1 Exact top-level option records

Each public API accepts exactly one local schema record with exactly these own keys and no others:

```text
draft options   -> ["experiment", "sourceAttackId", "proposal"]
confirm options -> ["draft", "decision"]
verify options  -> ["protection", "evaluator", "improvedEvaluator"]
```

The top-level options object itself must satisfy the Section 2.5 record boundary for that exact key set: local `Object.prototype`, extensible, non-Proxy, exact ordinary mutable property descriptors, no symbols, no accessors, no non-enumerable fields, no omissions, no extras.

Thus examples such as `{ experiment, sourceAttackId, proposal, metadata: 1 }`, frozen/sealed wrappers, or wrappers with non-writable/non-configurable properties reject asynchronously with `TypeError`; benign extras and alternate property surfaces are not accepted in V1.

For verify options, `evaluator` and `improvedEvaluator` are then validated by Section 2.3 rather than traversed as wire/data values.

### 3.2 `captureInvocationV1(options, callbackKeys)`

Public arguments become authoritative synchronously at invocation time, before the returned Promise is handed back.

Capture is descriptor-only and does not execute getters/setters or Proxy traps.

The exact top-level schema in Section 3.1 is checked from captured descriptors before descendant copying.

One `seenContainers` identity set is created for the **entire non-callback options graph** of that invocation, including the options record itself. Before copying any Object/Array container:

1. if its identity is already in `seenContainers`, capture fails immediately;
2. otherwise add it to `seenContainers` before traversing descendants;
3. Proxy => capture failure;
4. Array => source must satisfy the exact Section 2.6 local Array prototype/extensibility/dense index-descriptor/length rules;
5. non-Array object => run Section 2.4 mandatory brand probes, then require local `Object.prototype`, extensibility, and exact ordinary data descriptors required by its schema or Section 2.7;
6. accessors, symbol keys, malformed dense-array descriptors, non-ordinary data descriptors, non-extensible containers, or unreadable descriptor state => capture failure;
7. only after those facts pass may values be copied into fresh local containers with the exact canonical V1 descriptor/extensibility surfaces.

Thus cycles and repeated aliases are rejected during capture itself; capture can never normalize an aliased source graph into a tree by copying the same source identity twice.

Callback slots named by `callbackKeys` are captured by function identity and excluded from `seenContainers` traversal.

Any capture failure is stored internally. The API still returns its normal native Promise; semantic validation later rejects that Promise with `TypeError`. No public validation error is thrown synchronously.

Exact invocation captures:

```text
draft:   captureInvocationV1(options, [])
confirm: captureInvocationV1(options, [])
verify:  captureInvocationV1(options, ["evaluator", "improvedEvaluator"])
```

Caller mutation after invocation cannot change captured values or callback identities.

## 4. Prototype baseline for wire operations

M10 never transactionally mutates/restores global prototypes.

Before every M10/M8 experiment or artifact JSON wire probe, Gotcha verifies with captured intrinsics:

```text
Object.getPrototypeOf(Object.prototype) === captured original null
Object.getPrototypeOf(Array.prototype) === captured local Object.prototype
Object.prototype has no own "toJSON" property
Array.prototype has no own "toJSON" property
```

If the baseline is not exact, JSON probing is not invoked:

- M8 emits the non-replayable experiment variant;
- M10 draft/confirmation/verification boundary processing rejects with `TypeError` before evaluator execution.

## 5. Exact confirmed contract

Embedded contract, canonical build order:

```js
{
  version: 1,
  status: "confirmed",
  task,
  rules
}
```

`task` satisfies `isNonEmptyStringV1`.

The V1 rule-count limit is pinned to the current M8 constant value:

```text
MAX_RULES_V1 = 7
```

This is a normative literal V1 value, corresponding to current M8 `const MAX_RULES = 7`; implementations must not substitute a different runtime/configured limit.

`rules` is an exact array with **1..7** records exactly:

```js
{ id, statement, kind, severity }
```

`id` and `statement` satisfy `isNonEmptyStringV1`. Rule IDs are unique. `kind` is one of `required | forbidden | conditional`; `severity` is one of `critical | major | minor`.

## 6. M8 pre-callback capture, ownership, and experiment emission

Before the first evaluator or attack-generator callback of a `runContractAttacks()` attempt, M8 MUST:

1. validate the confirmed contract;
2. determine structural V1 eligibility of original pre-canonicalization `input` and `expectedOutput`, including mandatory brand/prototype/Array-descriptor rules;
3. capture independently owned canonical evaluator-case snapshots, preserving Section 2.7 schema-less key order and exact descriptor/extensibility surfaces;
4. freeze that eligibility decision and snapshots for the run.

Later caller/callback mutation cannot change that run's case authority.

Each retained attack output is independently snapshotted at retention time with the same wire/key-order/descriptor rules.

Every successful M8 run emits exactly one own `experiment` field.

### 6.1 Non-replayable experiment

If any eligibility, mandatory-probe availability, tree, numeric, prototype-baseline, descriptor/extensibility, ownership-disjointness, or wire-safety check fails:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: false,
  task,
  reason: { code: "EXPERIMENT_NOT_WIRE_REPLAYABLE" }
}
```

Drafting rejects this variant before proposal processing.

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

Exact keys are shown above. `task === contract.task`. The complete experiment satisfies `isTreeGraphV1`. Every schema record/array and schema-less wire record inside it also satisfies the exact descriptor/extensibility surface assigned by Sections 2.5–2.7.

The replayable experiment is also a **fully independent ownership island** inside the returned M8 result. Every Object/Array identity reachable from `result.experiment` must be disjoint from every Object/Array identity reachable through every other own result path, including but not limited to `generatedAttacks`, `attack`, `attack.results`, `topFinding`, retained/ranked survivor structures, and any compatibility fields. No rule/attack/output/case/baseline container may be reused between the experiment and a sibling result path.

This disjointness check is by identity over the complete returned M8 result before exposure. If any experiment-reachable container is also reachable from a non-`experiment` result path, M8 must rebuild the experiment from independent deep-owned snapshots before return; if it cannot do so safely, it emits the non-replayable variant.

After construction and disjointness establishment, Gotcha checks Section 4 and probes:

```js
{ experiment: completeCandidateExperiment }
```

using captured JSON intrinsics.

Replayable requires successful stringify/parse, complete parsed revalidation, parsed whole-experiment tree validity, exact schema-record/array/schema-less descriptor and extensibility reproduction, exact schema-less key-order reproduction, deep equality of retained case/attack payloads, exact signed-zero-safe numerics, and every cross-field invariant.

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

Attack count is `0..20`. `id`, `ruleId`, `type`, `description`, and `rationale` satisfy `isNonEmptyStringV1`. Attack IDs are unique.

`realism`, `subtlety`, `novelty`, `fixability` each satisfy `isWireNumberV1` and `0 <= value <= 1`.

`attack.severity` is exactly derived from rule severity:

```text
critical -> 1.0
major    -> 0.7
minor    -> 0.4
```

Embedded attack rule exactly matches the active contract rule and `attack.ruleId === attack.rule.id`.

`output` passes current M8 AI-data validation plus `isWireValueV1`.

For unchanged-output filtering and same-rule duplicate filtering, M8/V1 uses **exactly `isM8AttackFilterEqualV1` from Section 2.11**:

```text
isM8AttackFilterEqualV1(output, expectedOutput) === true -> filter as unchanged
same rule && isM8AttackFilterEqualV1(outputA, outputB) === true -> later duplicate is filtered
```

Thus order-only object-key permutations are explicitly excluded from retained attacks, while exact key order of every retained output remains replay authority.

Each baseline outcome is exactly:

```js
{ attackId, evaluatorResult: "PASS" | "FAIL", survived: boolean }
```

`outcomes[i].attackId === attacks[i].id`; exactly one outcome exists per attack. `evaluatorResult === "PASS"` iff `survived === true`.

`survivorOrderIds` contains exactly survived IDs in M8 rank order. `topFindingId` is exactly `survivorOrderIds[0]` when the survivor array is non-empty, otherwise `null`.

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

Authority bindings:

```text
proposal.task === experiment.task
proposal.sourceAttackId === requested sourceAttackId
proposal.ruleId === selectedAttack.ruleId
```

Extra fields, executable values, accessors, Proxies, mandatory forbidden brands, custom/cross-realm prototypes, alternate descriptor/extensibility surfaces, cycles, and aliases reject.

## 9. Public completion contract

All three APIs always return a genuine local native Promise from captured local Promise machinery.

Boundary/schema/value/status/authority/wire-probe errors reject with `TypeError`. Error text is non-authoritative.

There is no proposal-generator throw/rejection/thenable channel inside M10 core.

Evaluator failures classified in Section 16 resolve semantic verification results and do not reject.

## 10. Drafting algorithm

The drafting continuation performs exactly:

1. validate invocation capture and exact draft-options schema;
2. validate replayable experiment completely, including whole-experiment tree, schema-less key-order semantics, exact record/array descriptor-extensibility surfaces, and artifact-independent M8 ownership assumptions encoded by the experiment boundary;
3. require `sourceAttackId` to identify exactly one original baseline survivor;
4. create `experimentAuthority = deepOwnedSnapshotV1(experiment)`;
5. validate captured declarative proposal;
6. construct a fresh local draft from independent snapshots, allocating every artifact container independently with exact Section 2.5/2.6 surfaces;
7. set `status: "draft"`;
8. validate complete artifact and whole-artifact tree semantics;
9. perform Section 13 completed-artifact wire probe;
10. resolve the draft.

No model/provider/user callback executes in drafting.

## 11. Draft, decision, confirmation, rejection

Artifact shape, canonical build order:

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

Every schema record/array in the artifact satisfies Sections 2.5–2.6, and every nested schema-less experiment value satisfies Section 2.7. The complete artifact satisfies `isTreeGraphV1` before return and whenever accepted later.

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

Confirmation outputs are deep-owned tree snapshots sharing no mutable nested reference with captured draft or decision and using exact V1 property/index descriptor and extensibility surfaces.

Cross-field invariants at draft/confirmation/verification:

```text
task === experiment.task === experiment.contract.task
source.attackId -> exactly one bound original survivor
source.ruleId === selectedAttack.ruleId
rule.id === source.ruleId === selectedAttack.rule.id
rule statement/kind/severity === selected attack rule snapshot
selected attack rule snapshot === active embedded contract rule
```

## 12. Canonical object construction order and public property surfaces

Gotcha-created **schema records** use exactly the key order shown by their schemas in this document and exactly the extensible ordinary mutable data-property surface from Section 2.5.

Gotcha-created **schema Arrays** use ordinary dense Array construction with the exact extensibility, index descriptors, and `length` descriptor from Section 2.6.

This includes experiment, contract, rules, attacks, outcomes, proposal normalization, protection artifacts, source/rule/protection records, normalized replay payloads, diagnostic arrays, and verification results.

Caller/reloaded schema-record insertion order is not authority, but its accepted descriptor/extensibility surface is exact and must match Sections 2.5–2.6.

Schema-less evaluator-facing wire records are the exception for key ordering and follow Section 2.7: their captured own-key order is replay authority and must be preserved, not schema-normalized or sorted. Their descriptor/extensibility surface is nevertheless exact and ordinary mutable.

Array order remains semantic according to Sections 7, 17, 18, and 21.

## 13. Completed-artifact wire safety

`probeCompletedProtectionArtifactV1(artifact)` is the single normative protection-artifact wire probe used by drafting, confirmation, and verification.

Before serialization:

1. complete artifact satisfies `isTreeGraphV1`;
2. every schema/schema-less container satisfies the exact descriptor/extensibility surface from Sections 2.5–2.7;
3. Section 4 prototype baseline passes.

Using captured JSON intrinsics, Gotcha stringifies/parses the exact completed artifact.

Success requires:

1. stringify succeeds, including runtime nesting/string-size limits;
2. parse succeeds;
3. parsed artifact fully revalidates for its exact status/schemas;
4. complete parsed artifact satisfies `isTreeGraphV1`;
5. parsed experiment remains a valid replayable experiment;
6. schema record/array/schema-less descriptor and extensibility surfaces reproduce exactly;
7. schema-less wire-record key sequences reproduce exactly;
8. cross-field bindings remain exact;
9. parsed protection strings equal pre-probe strings byte-for-byte.

Any failure is a `TypeError` boundary failure.

Drafting and confirmation MUST invoke this probe after final text/status is known and immediately before resolving their artifact.

Verification MUST independently invoke this same probe again on its invocation-captured confirmed artifact before creating verification authority or executing either evaluator. Verification may not rely on the fact that some earlier process once probed the artifact.

Therefore a reconstructed/edited-in-storage artifact, an artifact whose current serialized size exceeds runtime limits, an artifact with normalized-away descriptor differences, or an artifact presented while the Section 4 prototype baseline is invalid is rejected by the verification Promise with `TypeError` **before the first evaluator callback**.

## 14. Verification authority snapshot

Verification performs, in exact order:

1. validate invocation capture and exact verify-options schema;
2. validate `evaluator` and `improvedEvaluator` with Section 2.3;
3. require `protection.status === "confirmed"` and validate Sections 11–12;
4. run `probeCompletedProtectionArtifactV1(protection)` from Section 13 and reject with `TypeError` on any failure;
5. only after the successful probe, create one independent `verificationAuthority` deep snapshot with exact V1 descriptor/extensibility surfaces;
6. execute baseline replay.

Baseline and improved phases derive every case, attack, result-protection, baseline-history, and source value only from `verificationAuthority`.

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

Evaluator-facing `expectedOutput` and `mutatedOutput` projections preserve the schema-less key order and exact ordinary mutable descriptor/extensibility surface frozen in experiment authority.

## 16. Exact evaluator failure classification to state mapping

M8 exposes stable classification:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

`returned-false` is failure only in positive control; attack callback `false` is a normal caught result.

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
  survivorOrderIds,
  topFindingId
}
```

`outcomes` contains one normalized outcome per bound attack in bound attack order.

`survivorOrderIds` contains the **actual completed M8 survivor IDs in M8 rank order** for that replay; it is not a fixed empty literal.

`topFindingId` is exactly:

```text
survivorOrderIds.length > 0 ? survivorOrderIds[0] : null
```

Therefore every non-empty completed replay summary has a non-null top finding equal to its first ranked survivor, and every zero-survivor replay has `topFindingId === null`.

Payload records/arrays are fresh independent tree snapshots using the exact Sections 2.5–2.6 surfaces and never expose full mutable M8 results.

## 19. Uniform verification result and ownership

Every semantic result is exactly, in this canonical key order:

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

`protection` is a fresh exact `{ statement, rationale }` snapshot. Every non-null nested record/array in the result is freshly allocated for exactly one result path, extensible, and uses exact ordinary mutable data/index descriptors. No diagnostic array is reused for another field, even when arrays have equal/empty contents.

Before resolving verification, the **complete result object** must satisfy `isTreeGraphV1` plus Sections 2.5–2.6 descriptor/extensibility rules. A result that contains any repeated Object/Array identity, cycle, or non-canonical public property surface is an internal construction failure and the verification Promise rejects with `TypeError`; such a result is never exposed.

No field is omitted and `undefined` is never used.

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
eliminatedAttackIds = fresh []
regressionAttackIds = fresh []
```

Every other array shown as `[]` is also a distinct fresh extensible Array for its own field with ordinary mutable index descriptors and the exact Section 2.6 length descriptor.

## 20. Complete replay semantics

On complete improved replay:

```text
sourceFindingCaught = source after-outcome survived === false
eliminated = baseline survived -> after caught
regression = baseline caught -> after survived
improvement = baseline.survivorOrderIds.length - after.survivorOrderIds.length
```

Diagnostic ID arrays use bound attack order and are independently allocated with exact Section 2.6 surfaces.

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

The completed result is validated as a whole tree with exact public record/array surfaces under Section 19 before resolution.

## 21. Ordering

`baselineMismatchAttackIds`, `eliminatedAttackIds`, `regressionAttackIds`, experiment baseline outcomes, and normalized replay outcomes use bound attack order.

`survivorOrderIds` uses M8 rank order, and every completed replay binds `topFindingId` exactly to its first survivor or `null` when empty.

`failureReasons` uses Sections 19–20 order and contains no duplicates.

Schema-record property construction follows Section 12. Schema-less evaluator-facing record keys follow Section 2.7.

M8 attack-retention equality is separately fixed by Section 2.11 and intentionally ignores object insertion order only for unchanged/duplicate filtering.

## 22. Required proof matrix

Implementation is not complete until tests prove at least:

- all three top-level public option records reject omissions, extras, symbols, accessors, Proxies, non-local prototypes, non-enumerable fields, non-writable/non-configurable properties, and sealed/frozen/non-extensible wrappers;
- every accepted and Gotcha-created schema record is extensible and every own schema property is exactly writable/enumerable/configurable `true`; direct snapshots and JSON-reloaded records expose the same property surface;
- every accepted/Gotcha-created schema Array is extensible, every index descriptor is exactly writable/enumerable/configurable `true`, and `length` is exactly `{ writable: true, enumerable: false, configurable: false, value: length }`; sealed/frozen/non-extensible or non-ordinary-index Arrays reject;
- schema-less wire records require extensibility plus exact writable/enumerable/configurable `true` descriptors recursively, preserve captured key order, and reproduce both order and descriptor surface through deep snapshot and JSON reload;
- `isNonEmptyStringV1` uses captured trim semantics;
- `isWireNumberV1` uses captured `Number.isFinite` and captured `Object.is`;
- the Section 2.4 forbidden-brand probe list is exact and missing any mandatory probe triggers the fail-closed fallback;
- prototype-rewritten covered intrinsic exotics reject before normalization;
- the exact V1 contract rule limit is 7: a valid 7-rule confirmed contract is accepted and an otherwise valid 8-rule contract rejects before replay/drafting;
- invocation capture uses one identity set for the complete non-callback options graph and rejects cycles/repeated aliases before copying;
- an aliased experiment/proposal/artifact cannot be normalized into a valid tree by invocation capture;
- immediate caller mutation after API return cannot replace experiment/proposal/draft/protection/decision/evaluator authority;
- all public validation failures remain asynchronous native-Promise rejections;
- M10 drafting executes no proposal/model callback;
- exact proposal schema/authority binding rejects extra/executable/rebound data;
- complete experiment and protection-artifact tree traversal rejects aliases/cycles before and after JSON round trip;
- every Object/Array reachable from a replayable `result.experiment` is disjoint from every Object/Array reachable from every other M8 result path; mutating `generatedAttacks`, `attack.results`, `topFinding`, or other legacy fields cannot mutate experiment authority;
- schema-less wire records preserve captured recursive own-key order through snapshot, experiment emission, JSON reload, and evaluator replay;
- order-only object-key mutation is filtered as unchanged/duplicate by `isM8AttackFilterEqualV1` and is not retained as a V1 attack;
- retained attacks preserve their exact historical schema-less output key order;
- `-0` rejects in case/output values and every score field;
- pre-callback M8 case eligibility is frozen;
- prototype baseline checks include prototype-chain identity and own `toJSON` absence;
- canonical Gotcha-built schema-record order matches Section 12;
- artifact protection text rejects empty/whitespace-only values for every status;
- drafting resolves only draft; confirmation accepts only draft and maps accept/edit/reject exactly;
- every completed artifact is probed after final text/status and whole-artifact tree/descriptor validation;
- **verification reruns the exact Section 13 artifact wire probe on its captured confirmed artifact before any evaluator callback**;
- a verification-time size/prototype-baseline/probe/descriptor-surface failure rejects with `TypeError` and neither evaluator runs;
- huge/escape-heavy proposal/edit text that cannot stringify rejects;
- baseline/improved evaluator phase/reason mappings are exact;
- baseline identity gates improved execution;
- all partial results have exact field values and exact public property/index surfaces;
- every completed normalized replay payload reports actual M8 `survivorOrderIds`, and `topFindingId` is exactly the first survivor or `null` when none survive;
- every verification result satisfies `isTreeGraphV1` with no shared container identities and exact canonical public descriptor/extensibility surfaces;
- simultaneous regression + source survival reports both reasons in canonical order;
- existing successful M8 behavior remains unchanged except additive experiment emission and the explicitly specified independent experiment snapshots.

## 23. Scope and stopping rule

Expected implementation touches:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

No callback-realm/prototype-guard helper is required.

Provider/model adapters remain outside the trusted M10 core and may be added later around the declarative proposal boundary.

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

M10 is implementation-ready only when a fresh exact-head architecture review finds no concrete contradiction or remaining V1 implementation-choice ambiguity in public option schemas, exact record/array/schema-less property surfaces, invocation capture, mandatory intrinsic-brand handling, exact rule-count/Array descriptors, schema-less wire key order, M8 attack-filter equality, experiment/legacy-result ownership disjointness, experiment/artifact/result tree semantics, verification-time wire re-probing, prototype-baseline wire safety, replay ordering/summary binding, evaluator-state mapping, or result semantics.

Out of scope: provider adapters, lossless arbitrary graph/prototype serialization, cryptographic provenance, dashboards, production-model execution inside M10 core, AI-generated executable code, automatic patching, universal future-attack proof, and unrelated engine redesign.