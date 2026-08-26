# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 15
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal and authority

M10 turns one confirmed M8 survivor into a human-authorized declarative protection and verifies an externally supplied improved evaluator against the exact bound M8 experiment.

AI never supplies executable evaluator code. Human confirmation is mandatory. The caller owns executable evaluator changes. Gotcha owns boundary validation, authority capture, replay ordering, artifact wire safety, and deterministic result semantics.

Public callbacks are exactly:

```js
generator(input) -> value | genuine native Promise<value>
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

All three public M10 APIs always return a genuine local native Promise.

## 2. Normative primitives

Equivalent implementation code is allowed only when observable acceptance, rejection, callback execution, serialization, ownership, ordering, and completion behavior is identical.

### 2.1 `isExactRecordV1(value, exactKeys)`

A schema record passes only when all are true:

1. captured `util.types.isProxy(value) === false`;
2. captured `Object.getPrototypeOf(value) === Object.prototype` from Gotcha's local realm;
3. captured `Reflect.ownKeys(value)` contains exactly `exactKeys`, with no symbols, omissions, or extras;
4. each required key is an enumerable own data property;
5. accessors and non-enumerable schema fields reject;
6. semantic values are read only from captured own-property descriptors.

This applies to every local public/artifact/schema record. The isolated generator projection has its own exact callback-realm rule in Section 10.

### 2.2 `isExactArrayV1(value)`

A schema array passes only when all are true:

1. captured `util.types.isProxy(value) === false`;
2. captured `Array.isArray(value) === true`;
3. captured `Object.getPrototypeOf(value) === Array.prototype` from Gotcha's local realm;
4. own keys are exactly canonical indices `0..length-1` plus `"length"`;
5. every index is an enumerable own data property;
6. no holes, symbols, accessors, non-enumerable indices, or extra named keys exist;
7. `length` is the ordinary array length data property.

This applies to all local schema arrays, including `rules`, `attacks`, `outcomes`, survivor IDs, diagnostic ID arrays, and `failureReasons`.

### 2.3 `isNonEmptyStringV1(value)`

Exactly:

```text
typeof value === "string" && value.trim().length > 0
```

Whitespace-only strings reject. Accepted strings are preserved byte-for-byte; validation never silently trims or normalizes them.

### 2.4 `isWireNumberV1(value)`

Exactly:

```text
typeof value === "number"
Number.isFinite(value) === true
Object.is(value, -0) === false
```

Every serialized non-literal numeric field uses this primitive. Literal `version: 1` is validated as the literal value.

### 2.5 `isAcceptedCallbackV1(value)`

A callback is accepted iff `typeof value === "function"` and captured `util.types.isProxy(value) === false`.

No realm or function-kind restriction is imposed. Ordinary, bound, native, async, and cross-realm functions are accepted if non-Proxy.

### 2.6 `isWireValueV1(value)`

Allowed scalars are `null`, string, boolean, and `isWireNumberV1` numbers.

Allowed arrays are exact dense local arrays containing only recursively allowed values.

Allowed objects are non-Proxy local ordinary objects with only enumerable string own data properties containing recursively allowed values.

Traversal uses one identity set for the entire value. Repeated Object/Array identity and cycles reject.

Therefore `undefined`, bigint, symbol, functions, accessors, null/custom/cross-realm prototypes, sparse arrays, repeated identity, cycles, Date, Map, Set, RegExp, Promise, typed arrays, ArrayBuffer/DataView, non-finite numbers, and `-0` are non-replayable V1.

### 2.7 `isTreeGraphV1(root)`

Traverse every Object/Array reachable from `root` using one shared identity set. Each reachable Object/Array identity MUST occur at exactly one path. Any repeated identity or cycle rejects.

This primitive is applied to the complete replayable experiment and to every complete draft/confirmed/rejected protection artifact. It is not limited to case payloads. Thus aliases across fields such as `case.input.a === case.expectedOutput.b`, or `artifact.rule === artifact.experiment.attacks[0].rule`, are forbidden.

### 2.8 `deepOwnedSnapshotV1(value)`

A deep owned snapshot shares no mutable Object/Array reference with its source graph and preserves the exact V1 semantic value. A snapshot used as replayable experiment/artifact authority must itself satisfy `isTreeGraphV1`.

### 2.9 `captureInvocationV1(options, callbackKeys)`

Public arguments become authoritative at invocation time, before the returned Promise is handed back.

Capture is descriptor-only and side-effect-free with respect to user code. It uses captured `util.types.isProxy`, `Object.getOwnPropertyDescriptors`, `Object.getPrototypeOf`, `Reflect.ownKeys`, and `Array.isArray`.

For every Object/Array encountered before copying:

1. Proxy => capture-failure sentinel;
2. Array => source prototype MUST be Gotcha's local `Array.prototype`; otherwise capture-failure sentinel;
3. non-Array object => source prototype MUST be Gotcha's local `Object.prototype`; otherwise capture-failure sentinel;
4. accessors, symbol keys, malformed dense-array descriptors, or unreadable descriptor state => capture-failure sentinel;
5. only after these rejection-relevant facts pass is the container copied into a fresh local container.

Therefore invocation capture never normalizes a forbidden custom, null, exotic, or cross-realm container into an acceptable local record. Rejection-relevant prototype facts are decided on the source before copying.

Callback slots named by `callbackKeys` are captured by function identity and are not traversed. Repeated identity is preserved only long enough for later tree checks to reject where required. No getter/setter or Proxy trap is invoked. Any capture failure is stored internally and later becomes asynchronous `TypeError` rejection; capture never throws synchronously to the caller.

Caller mutation after invocation cannot change captured option values, nested authority, decision text, or callback identity used by that invocation.

## 3. Exact confirmed contract

The embedded contract is exactly:

```js
{
  version: 1,
  status: "confirmed",
  task,
  rules
}
```

`task` satisfies `isNonEmptyStringV1`. `rules` is an exact array with `1..MAX_RULES` exact records:

```js
{ id, statement, kind, severity }
```

`id` and `statement` satisfy `isNonEmptyStringV1`. Rule IDs are unique. `kind` is one of `required | forbidden | conditional`; `severity` is one of `critical | major | minor`. Extra contract/rule keys reject.

## 4. M8 pre-callback capture

Before the first evaluator or generator callback of a `runContractAttacks()` attempt, M8 MUST:

1. validate the confirmed contract;
2. determine structural V1 eligibility of original pre-canonicalization `input` and `expectedOutput`;
3. capture independently owned canonical evaluator-case snapshots;
4. freeze that eligibility decision and those snapshots for the run.

Later caller/generator mutation cannot change case replayability or emitted case authority.

Each retained attack output is independently snapshotted at retention time before its evaluator attack callback can affect later artifact construction.

## 5. Required experiment variants

Every successful M8 run emits exactly one own `experiment` field.

### 5.1 Non-replayable

If any V1 eligibility, numeric, tree-graph, or wire-safety check fails, emit exactly:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: false,
  task,
  reason: { code: "EXPERIMENT_NOT_WIRE_REPLAYABLE" }
}
```

No contract/case/attack/baseline payload is exposed. Drafting rejects this variant before generator invocation.

### 5.2 Replayable

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

Exact keys are those shown. `task === contract.task`. The complete experiment MUST satisfy `isTreeGraphV1`; no Object/Array identity may appear at two paths anywhere in the experiment.

## 6. Experiment wire probe and inherited `toJSON` hardening

After M8 constructs the complete candidate experiment and before classifying it replayable, Gotcha verifies from captured descriptors that local `Object.prototype` and `Array.prototype` have no own `toJSON` property. If either exists, the experiment is non-replayable and `JSON.stringify` is not invoked.

Using captured untampered `JSON.stringify` / `JSON.parse`, Gotcha probes:

```js
{ experiment: completeCandidateExperiment }
```

A run is replayable only if stringify and parse succeed, the parsed envelope/experiment fully revalidate, the complete parsed experiment satisfies `isTreeGraphV1`, parsed case/attack payloads are M8-deep-equal to candidate snapshots, all signed-zero-safe numeric checks hold, and every cross-field invariant holds.

This does not replace the completed-artifact probe in Section 13.

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

Each score `realism`, `subtlety`, `novelty`, `fixability` satisfies `isWireNumberV1` and `0 <= value <= 1`; `-0` rejects.

`attack.severity` is exactly derived from rule severity:

```text
critical -> 1.0
major    -> 0.7
minor    -> 0.4
```

The embedded attack rule exactly matches the active contract rule. `attack.ruleId === attack.rule.id`.

`output` passes current M8 AI-data validation and `isWireValueV1`, differs from `expectedOutput`, and retained attacks contain no same-rule/deep-equal duplicate.

Each baseline outcome is exactly:

```js
{ attackId, evaluatorResult: "PASS" | "FAIL", survived: boolean }
```

`outcomes[i].attackId === attacks[i].id`. There is exactly one outcome per attack. `evaluatorResult === "PASS"` iff `survived === true`.

`survivorOrderIds` contains exactly survived IDs in M8 rank order. `topFindingId` is the first survivor ID or `null`.

## 8. Public API options and invocation authority

Exact options are:

```js
// draftContractProtection
{ experiment, sourceAttackId, generator }

// confirmContractProtection
{ draft, decision }

// verifyContractProtection
{ protection, evaluator, improvedEvaluator }
```

Before returning the Promise:

```text
draft:   captureInvocationV1(options, ["generator"])
confirm: captureInvocationV1(options, [])
verify:  captureInvocationV1(options, ["evaluator", "improvedEvaluator"])
```

No callback executes synchronously. Capture failure becomes asynchronous `TypeError` rejection. All later work uses only invocation capture; caller options are never reread.

## 9. Public completion contract

All three APIs always return a genuine local native Promise created from captured local Promise intrinsics.

Boundary/schema/value/status/authority errors reject that Promise with `TypeError`. Error text is non-authoritative.

`draftContractProtection` generator synchronous throw rejects with the exact thrown value; a genuine native generator Promise rejection rejects with the exact reason, subject to the prototype-guard precedence in Section 11. Arbitrary thenables are never assimilated.

Evaluator failures classified in Section 16 resolve semantic verification results and do not reject.

## 10. Drafting authority and exact isolated generator projection

The drafting continuation performs exactly:

1. validate invocation capture;
2. validate replayable experiment completely, including `isTreeGraphV1`;
3. require `sourceAttackId` to identify exactly one original baseline survivor;
4. create `experimentAuthority = deepOwnedSnapshotV1(experiment)`;
5. derive all source/rule/case values only from `experimentAuthority`;
6. create a fresh dedicated callback realm for this drafting invocation;
7. project exact generator input into that realm using Section 10.1;
8. execute generator under the exclusive prototype guard in Section 11;
9. validate generator output;
10. construct a fresh local draft from independent snapshots of authority and validated generator output, with no aliases across artifact fields;
11. set `status: "draft"`;
12. run the completed-artifact wire probe in Section 13 before resolving.

### 10.1 Exact callback-realm container semantics

Every projected generator-input record is created in the fresh callback realm with:

- prototype exactly that realm's `%Object.prototype%`;
- exactly the specified own string keys and no symbols;
- every schema property an own data property with `{ writable: true, enumerable: true, configurable: true }`;
- `Object.isExtensible(record) === true`.

Every projected array is created in that realm with:

- prototype exactly that realm's `%Array.prototype%`;
- dense canonical indices `0..length-1` only plus ordinary `length`;
- every index `{ writable: true, enumerable: true, configurable: true }`;
- ordinary array `length` descriptor `{ writable: true, enumerable: false, configurable: false }`;
- `Object.isExtensible(array) === true`.

Nested records/arrays follow the same rule recursively. Scalars preserve exact V1 value. The projection is a tree and shares no Object/Array identity or Object/Array prototype with `experimentAuthority` or Gotcha local authority containers.

Thus a generator observing `Object.getPrototypeOf`, `Reflect.ownKeys`, property descriptors, extensibility, or mutation sees one deterministic callback boundary.

Generator input semantic fields are exactly:

```js
{ contract, input, expectedOutput, finding, instructions }
```

`finding` is the selected attack. `instructions` is exactly:

```text
The confirmed Quality Contract and selected rule are authoritative. Propose one narrow declarative evaluator-protection intent for the selected finding. Preserve unrelated correct behavior. Prefer a rule-level protection over exact-output blacklisting. Return only the required declarative schema. Do not return executable code, callbacks, ASTs, shell commands, patches, contract edits, rule-authority edits, or claims that the protection is already proven effective. Do not claim the production model produced the attack candidate.
```

## 11. Generator completion and Gotcha prototype guard

A fresh callback realm isolates prototypes reachable through generator input, but callback code executes in the function's own ECMAScript realm. Therefore M10 also guards Gotcha's local authority prototypes.

All generator callback executions share one module-level exclusive async guard. Only one generator may hold this guard at a time, and the guard remains held through settlement of a genuine native Promise returned by that generator.

Immediately after acquiring the guard and before callback invocation, Gotcha captures the complete `Reflect.ownKeys` set and every own property descriptor of local `Object.prototype` and local `Array.prototype` using captured intrinsics.

Then:

1. invoke `generator(generatorInput)` exactly once;
2. if it returns a genuine native Promise recognized by the captured M8 Promise brand probe, await that Promise while retaining the exclusive guard;
3. arbitrary thenables are direct values and `.then` is never invoked;
4. in a `finally` path, before releasing the guard, compare both local prototype surfaces to the captured snapshots and restore them exactly: delete added own keys and redefine every original own property to its captured descriptor;
5. verify after restoration that both surfaces exactly equal the pre-callback snapshots;
6. release the guard only after verification.

Completion precedence is exact:

- if exact restoration cannot be completed/verified, reject drafting with `TypeError`;
- else if generator threw synchronously, reject with that exact thrown value;
- else if awaited genuine native Promise rejected, reject with that exact reason;
- else if either guarded prototype surface was mutated during callback lifetime, reject with `TypeError` after successful restoration;
- otherwise validate the produced direct/fulfilled value.

This guard prevents local-realm generator code such as `Object.prototype.toJSON = ...` or `Array.prototype.x = ...` from changing experiment authority, artifact serialization, or another concurrent drafting invocation.

Generator output is exactly:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection: { statement, rationale }
}
```

`task`, `sourceAttackId`, `ruleId`, `protection.statement`, and `protection.rationale` each satisfy `isNonEmptyStringV1`. Authority IDs exactly match `experimentAuthority`. Extra/executable values reject.

## 12. Draft, decision, confirmation, rejection

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

For every artifact status, `task`, `source.attackId`, `source.ruleId`, `rule.id`, `rule.statement`, `protection.statement`, and `protection.rationale` satisfy `isNonEmptyStringV1`. `rule.kind` and `rule.severity` satisfy the exact contract-rule enums. This validation is reapplied to reconstructed/serialized draft, confirmed, and rejected artifacts; it is not inferred only from prior generator output.

The complete artifact MUST satisfy `isTreeGraphV1` before it can be returned or accepted by a later API.

`draftContractProtection()` resolves only `status: "draft"`.

`confirmContractProtection()` accepts only `status: "draft"`; confirmed/rejected artifacts cannot be reconfirmed.

Decisions are exactly:

```js
{ type: "accept" }
{ type: "edit", statement }
{ type: "reject" }
```

`edit.statement` satisfies `isNonEmptyStringV1` and changes only `protection.statement`.

Exact mapping:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Confirmation outputs are deep-owned tree snapshots sharing no mutable nested reference with captured draft or decision. Builders MUST allocate fresh top-level `source`, `rule`, `protection`, and nested experiment containers rather than aliasing any object already reachable elsewhere in the returned artifact.

Cross-field invariants at draft/confirmation/verification are:

```text
task === experiment.task === experiment.contract.task
source.attackId -> exactly one bound original survivor
source.ruleId === selectedAttack.ruleId
rule.id === source.ruleId === selectedAttack.rule.id
rule statement/kind/severity === selected attack rule snapshot
selected attack rule snapshot === active embedded contract rule
```

## 13. Completed-artifact wire safety

Every draft, confirmed artifact, and rejected artifact is wire-probed after final protection text/status is known and immediately before the public Promise resolves.

Before serialization, the complete artifact itself MUST satisfy `isTreeGraphV1`. The probe then repeats the inherited `toJSON` hardening check: local `Object.prototype` and `Array.prototype` must have no own `toJSON` property.

Using captured `JSON.stringify` / `JSON.parse`, Gotcha stringifies and parses the exact completed artifact.

Resolution is allowed only if:

1. pre-probe artifact satisfies `isTreeGraphV1`;
2. stringify succeeds, including escaping and runtime maximum string-size constraints;
3. parse succeeds;
4. parsed artifact fully revalidates for its exact status and all local schemas;
5. the COMPLETE parsed artifact satisfies `isTreeGraphV1`, not merely `parsedArtifact.experiment`;
6. parsed experiment remains a valid replayable experiment;
7. cross-field bindings remain exact;
8. parsed protection strings equal pre-probe strings byte-for-byte.

Any failure rejects corresponding drafting/confirmation Promise with `TypeError`; no unserializable or identity-drifting artifact is returned.

This probe is mandatory after generator output and after every accept/edit/reject construction. Therefore model/editor text length and top-level-to-nested aliasing cannot bypass the supported serialized/reloaded flow.

## 14. Verification authority snapshot

Verification accepts only `status: "confirmed"` whose complete artifact satisfies Section 12 and `isTreeGraphV1`.

Because `captureInvocationV1` deep-captured caller protection at invocation, the verification continuation validates that capture and creates one further independent `verificationAuthority` before the first baseline callback. Both phases derive all case, attack, result-protection, baseline-history, and source data only from `verificationAuthority`.

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

`returned-false` is a failure reason only in `positive-control`; an attack callback returning `false` is a normal caught result.

Baseline mapping:

```text
positive-control + returned-false -> baseline-positive-control-failed
positive-control + threw          -> baseline-execution-failed
positive-control + non-boolean    -> baseline-execution-failed
attack-evaluation + threw         -> baseline-execution-failed
attack-evaluation + non-boolean   -> baseline-execution-failed
```

For baseline execution failure during positive control, `baselinePositiveControlPassed = null`; for attack-evaluation failure after passed control, `true`.

Improved mapping:

```text
positive-control + returned-false -> improved-positive-control-failed
positive-control + threw          -> improved-execution-failed
positive-control + non-boolean    -> improved-execution-failed
attack-evaluation + threw         -> improved-execution-failed
attack-evaluation + non-boolean   -> improved-execution-failed
```

For improved execution failure during positive control, `improvedPositiveControlPassed = null`; for attack-evaluation failure after passed control, `true`.

Every classified failure resolves the verification Promise with corresponding uniform partial result.

## 17. Strict baseline identity gate

Baseline runs first. Improved evaluation never starts until baseline positive control passes, baseline attack replay completes, and replay exactly matches bound historical identity.

Historical identity requires every per-attack classification, survivor rank order, and top finding to match.

`baselineMismatchAttackIds` contains exactly IDs whose replayed `evaluatorResult` or `survived` differs from bound outcome, in bound attack order. A pure ranking/top-finding mismatch with identical per-attack classifications yields `[]`.

## 18. Exact normalized replay payload

Whenever a replay completes, `baseline` or `after` is exactly:

```js
{
  outcomes: [
    { attackId, evaluatorResult: "PASS" | "FAIL", survived: boolean }
  ],
  survivorOrderIds: [],
  topFindingId: null
}
```

Outcome order is bound attack order. Survivor order is M8 rank order. Payloads are independent snapshots and never expose full mutable M8 result.

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

Fixed: `version: 1`, `kind: "contract-protection-verification"`. `task`, `sourceAttackId`, `sourceRuleId`, `protection.statement`, and `protection.rationale` satisfy `isNonEmptyStringV1`. `protection` is an independent exact `{ statement, rationale }` snapshot. No field is omitted and `undefined` is never used.

### 19.1 Partial states

| State | baseline PC | improved PC | baseline | after | mismatch IDs | source caught | improvement | failureReasons |
|---|---|---|---|---|---|---|---|---|
| `baseline-positive-control-failed` | `false` | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-positive-control-failed"]` |
| `baseline-execution-failed` | Section 16 (`null` or `true`) | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-execution-failed"]` |
| `baseline-mismatch` | `true` | `null` | completed | `null` | Section 17 | `false` | `null` | `["baseline-mismatch"]` |
| `improved-positive-control-failed` | `true` | `false` | completed | `null` | `[]` | `false` | `null` | `["improved-positive-control-failed"]` |
| `improved-execution-failed` | `true` | Section 16 (`null` or `true`) | completed | `null` | `[]` | `false` | `null` | `["improved-execution-failed"]` |

For every partial state: `verificationPassed === false`, `eliminatedAttackIds === []`, and `regressionAttackIds === []`.

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

`sourceFindingCaught` reflects only source classification and may be `true` while verification fails because another attack regressed.

## 21. Ordering

`baselineMismatchAttackIds`, `eliminatedAttackIds`, `regressionAttackIds`, experiment baseline outcomes, and normalized replay outcomes use bound attack order. `survivorOrderIds` uses M8 rank order. `failureReasons` uses Sections 19–20 order and contains no duplicates.

## 22. Required proof matrix

Implementation is not complete until tests prove at least:

- invocation capture rejects/marks invalid cross-realm, null-prototype, custom-prototype, Proxy, accessor, and malformed-array containers before copying; none can be normalized into valid local records;
- caller mutation immediately after API return cannot replace experiment/draft/protection/decision/callback authority;
- all public validation failures remain asynchronous Promise rejections;
- complete experiment tree traversal rejects aliases across input/expectedOutput/attack/contract fields and cycles;
- complete protection-artifact tree traversal rejects aliases between top-level `rule`/`source`/`protection` and any nested experiment object, both before and after JSON round trip;
- JSON reload cannot de-alias any accepted experiment or artifact because both are trees;
- `-0` rejects in case/output values and every score field;
- pre-callback M8 case eligibility is frozen;
- generator projection has exact callback-realm prototypes, own keys, writable/enumerable/configurable data descriptors, ordinary array length descriptor, and extensibility;
- generator input shares neither data objects nor Object/Array prototypes with experiment authority;
- module-level generator guard serializes overlapping generator callback lifetimes;
- local `Object.prototype` / `Array.prototype` mutation during synchronous or native-Promise generator execution is detected, exactly restored, and rejects successful mutated completion with `TypeError`;
- callback throw/rejection is preserved after successful prototype restoration; restoration failure has `TypeError` precedence;
- generator direct/native-Promise semantics and arbitrary-thenable non-assimilation are exact;
- artifact `protection.statement` and `protection.rationale` reject empty/whitespace-only values for draft, confirmed, and rejected reconstructed artifacts;
- drafting resolves only `draft`; confirmation accepts only draft and maps accept/edit/reject exactly;
- every draft/confirmed/rejected artifact is probed after final text/status and whole-artifact tree validation;
- huge/escape-heavy generator or edit text that cannot stringify rejects rather than returning unserializable artifact;
- inherited local `toJSON` is rechecked before each wire probe and never executed;
- baseline and improved evaluator phase/reason mappings are exact per Section 16;
- attack-evaluation throw/non-boolean preserves passed-control fact;
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

A small internal callback-realm/prototype-guard helper may be added under `src/`. `src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

M10 is implementation-ready only when a fresh exact-head architecture review finds no concrete contradiction or V1 implementation-choice ambiguity in boundary primitives, invocation capture, experiment/artifact tree semantics, callback projection, prototype guarding, completed-artifact wire safety, evaluator-state mapping, ownership, replay ordering, or result semantics.

Out of scope: lossless arbitrary graph/prototype serialization, cryptographic provenance, provider adapters, dashboards, production-model execution, AI-generated executable code, automatic patching, universal future-attack proof, and unrelated engine redesign.
