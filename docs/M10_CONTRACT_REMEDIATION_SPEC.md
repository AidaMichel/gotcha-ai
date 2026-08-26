# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 11
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal and Authority

M10 turns one confirmed M8 survivor into a human-authorized declarative protection and then verifies an externally supplied improved evaluator against the exact bound M8 experiment.

AI never supplies executable evaluator code. Human confirmation is mandatory. The caller owns executable evaluator changes. Gotcha owns validation, immutable authority snapshots, replay ordering, and deterministic result semantics.

Public callbacks are exactly:

```js
generator(input) -> value | genuine native Promise<value>
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

## 2. Normative Boundary Primitives

Every implementation MUST use the following four semantic primitives. Equivalent internal code is allowed only if externally observable acceptance/rejection and ownership behavior is identical.

### 2.1 `isExactRecordV1(value, exactKeys)`

A schema record passes only when all are true:

1. `value` is not a Proxy.
2. `Object.getPrototypeOf(value) === Object.prototype` from Gotcha's local realm.
3. `Reflect.ownKeys(value)` contains exactly `exactKeys`, no extras, no omissions, no symbols.
4. Every key is an enumerable own data property; accessors and non-enumerable schema fields reject.
5. Semantic values are read only from captured own-property descriptors after these checks.

This primitive applies to every schema record in this document, including options, experiments, contracts, rules, case metadata, attacks, baseline records, generator input/output, drafts, decisions, confirmed/rejected artifacts, replay projections, failure records, and verification results.

### 2.2 `isExactArrayV1(value)`

Every schema array passes only when all are true:

1. `value` is not a Proxy.
2. `Array.isArray(value) === true`.
3. `Object.getPrototypeOf(value) === Array.prototype` from Gotcha's local realm.
4. Own keys are exactly canonical indices `0..length-1` plus `"length"`; no holes, symbols, or extra named keys exist.
5. Every indexed property is an enumerable own data property.
6. `length` is the ordinary own array length data property.

This primitive applies to every named schema array, including `rules`, `attacks`, `outcomes`, `survivorOrderIds`, `baselineMismatchAttackIds`, `eliminatedAttackIds`, `regressionAttackIds`, and `failureReasons`.

### 2.3 `deepOwnedSnapshotV1(value)`

A deep owned snapshot contains no mutable object/array reference shared with its source graph. For supported artifact data, implementations may use captured safe cloning or the validated JSON wire round trip, but the produced snapshot must preserve the exact V1 semantic value and must itself satisfy the relevant record/array/value schemas.

### 2.4 `isAcceptedCallbackV1(value)`

A callback is accepted iff:

- `typeof value === "function"`; and
- the value is not a Proxy.

No realm restriction is imposed. Ordinary, bound, native, async, and cross-realm functions are accepted if non-Proxy. M10 does not inspect source text or function prototypes. This same rule applies to `generator`, `evaluator`, and `improvedEvaluator`.

## 3. Wire-Replayable Value Predicate

`isWireValueV1(value)` is intentionally narrower than general M8 AI-data support.

Allowed scalars are exactly `null`, string, boolean, and finite number.

Allowed arrays must satisfy `isExactArrayV1`, contain only recursively allowed values, and contain no repeated object identity or cycle.

Allowed plain data objects must:

- be non-Proxy;
- have local `Object.prototype` exactly;
- contain only string own keys;
- expose every own property as enumerable data property;
- contain no symbols;
- contain only recursively allowed values;
- contain no repeated object identity or cycle.

Therefore `undefined`, bigint, symbol, functions, accessors, null-prototype objects, cross-realm/custom prototypes, sparse arrays, repeated/shared identity, cycles, Date, Map, Set, RegExp, Promise, typed arrays, ArrayBuffer/DataView, and non-finite numbers are non-replayable V1.

## 4. Exact Confirmed Contract Schema

The embedded confirmed contract is exactly:

```js
{
  version: 1,
  status: "confirmed",
  task,
  rules
}
```

Exact own keys are `version`, `status`, `task`, `rules`.

`task` is a non-empty string. `rules` satisfies `isExactArrayV1`, contains at least one and no more than the current M8 `MAX_RULES`, and contains exact rule records:

```js
{
  id,
  statement,
  kind,
  severity
}
```

Rule exact keys are `id`, `statement`, `kind`, `severity`.

`id` and `statement` are non-empty strings. Rule IDs are unique. `kind` is exactly one of `required`, `forbidden`, `conditional`. `severity` is exactly one of `critical`, `major`, `minor`.

M10 accepts no extra contract or rule keys even if the current M8 normalizer would otherwise discard them.

## 5. Pre-Callback M8 Case Capture

Before the first evaluator or generator callback of a successful `runContractAttacks()` attempt, M8 MUST:

1. validate the confirmed contract;
2. determine structural V1 eligibility of the original pre-canonicalization `input` and `expectedOutput`;
3. capture independently owned canonical evaluator-case snapshots used for any later experiment emission;
4. freeze the eligibility decision for those case values for the lifetime of the run.

Later caller/generator mutation of original case objects cannot change replayability classification or emitted case authority.

Each retained attack output is validated and independently snapshotted at retention time before evaluator attack callbacks can affect later artifact construction.

## 6. Required Experiment Variants

Every successful M8 run emits exactly one own `experiment` field.

### 6.1 Non-replayable

If case eligibility fails, any retained attack output fails `isWireValueV1`, or the complete replayable artifact wire probe in Section 7 fails, emit exactly:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: false,
  task,
  reason: { code: "EXPERIMENT_NOT_WIRE_REPLAYABLE" }
}
```

Exact keys are those shown. `reason` has exactly `code`. No contract/case/attacks/baseline payload is exposed in this variant. Drafting rejects it before generator invocation.

### 6.2 Replayable

The replayable variant is exactly:

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

Top-level exact keys are `version`, `kind`, `replayable`, `task`, `contract`, `case`, `attacks`, `baseline`.

`case` exact keys are `input`, `expectedOutput`, `replay`. `replay` exact keys and values are exactly those shown.

`task === contract.task`.

## 7. Full-Artifact Wire Probe

Replayability is not established by probing bare nested values alone.

After the successful M8 baseline run has produced retained attacks and bound outcomes, M8 MUST construct one complete independently owned replayable-candidate experiment using only the pre-callback case snapshots and retained-output snapshots.

Then, using captured untampered intrinsics, it MUST execute:

```text
JSON.stringify(completeCandidateExperiment)
JSON.parse(serializedExperiment)
```

A run is `replayable: true` only if:

1. stringify completes successfully;
2. parse completes successfully;
3. the parsed complete experiment revalidates against every exact record/array/value schema in this spec;
4. parsed case/attack payloads are M8-deep-equal to the candidate snapshots;
5. all cross-field invariants still hold.

Any failure yields the non-replayable variant. This full-artifact probe intentionally absorbs runtime JSON nesting limits introduced by artifact wrapper depth.

## 8. Exact Attack and Baseline Schemas

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

Attack array count is `0..20`. IDs are unique non-empty strings. `ruleId`, `type`, `description`, and `rationale` are non-empty strings. Scores are finite numbers in `[0,1]`. `output` passes current M8 AI-data validation and `isWireValueV1`, differs from `expectedOutput`, and retained attacks contain no same-rule/deep-equal duplicate. Embedded rule authority exactly matches the active contract rule.

Each baseline outcome is exactly:

```js
{
  attackId,
  evaluatorResult: "PASS" | "FAIL",
  survived: true | false
}
```

There is exactly one outcome per attack and no extras. `evaluatorResult === "PASS"` iff `survived === true`. `survivorOrderIds` is the duplicate-free ordered list of exactly survived attack IDs in M8 rank order. `topFindingId` equals its first element or `null`.

## 9. Exact Public Options

All options records use `isExactRecordV1` before semantic reads.

```js
// draftContractProtection
{ experiment, sourceAttackId, generator }

// confirmContractProtection
{ draft, decision }

// verifyContractProtection
{ protection, evaluator, improvedEvaluator }
```

Callbacks use `isAcceptedCallbackV1`. Malformed call shapes execute zero callbacks.

## 10. Drafting Ordering and Generator Input

`draftContractProtection()` performs this exact order:

1. validate options;
2. validate a replayable experiment completely;
3. require `sourceAttackId` to identify exactly one bound baseline survivor;
4. create `experimentAuthority = deepOwnedSnapshotV1(experiment)`;
5. derive the selected source, rule, contract, case, and generator input only from `experimentAuthority`;
6. invoke the generator once;
7. validate generator output;
8. construct the draft from independently owned snapshots of `experimentAuthority` and validated generator output.

The generator can never mutate the experiment authority later embedded in the draft because the authority snapshot exists before generator invocation.

Generator input is exactly:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  instructions
}
```

`finding` is an independently owned exact selected attack snapshot.

`instructions` is exactly this literal string:

```text
The confirmed Quality Contract and selected rule are authoritative. Propose one narrow declarative evaluator-protection intent for the selected finding. Preserve unrelated correct behavior. Prefer a rule-level protection over exact-output blacklisting. Return only the required declarative schema. Do not return executable code, callbacks, ASTs, shell commands, patches, contract edits, rule-authority edits, or claims that the protection is already proven effective. Do not claim the production model produced the attack candidate.
```

## 11. Generator Async Semantics

After all pre-generator validation and authority snapshotting:

1. invoke `generator(generatorInput)` synchronously inside a try boundary;
2. synchronous throw propagates unchanged;
3. only a genuine native Promise recognized by the captured side-effect-free M8 Promise brand probe is awaited;
4. native-Promise rejection propagates unchanged;
5. arbitrary thenables are never assimilated and their `.then` is never invoked;
6. direct values and genuine native-Promise fulfillment values are validated identically.

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

All authority IDs must match `experimentAuthority`; statement/rationale are non-empty strings; no executable values or extra keys are accepted.

## 12. Draft, Decision, Confirmation, Rejection

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

Every nested record/array is validated by Sections 2–8.

Decisions are exactly one of:

```js
{ type: "accept" }
{ type: "edit", statement: "non-empty string" }
{ type: "reject" }
```

`confirmContractProtection()` revalidates the full draft before applying the decision and always returns a `deepOwnedSnapshotV1` result sharing no mutable nested reference with the supplied draft or decision. Edit changes only `protection.statement`. Rejected artifacts cannot verify.

Cross-field invariants at draft, confirmation, and verification are:

```text
task === experiment.task === experiment.contract.task
source.attackId -> exactly one bound original survivor
source.ruleId === selectedAttack.ruleId
rule.id === source.ruleId === selectedAttack.rule.id
rule statement/kind/severity === selected attack rule snapshot
selected attack rule snapshot === active embedded contract rule
```

## 13. Verification Authority Snapshot

`verifyContractProtection()` performs this exact order:

1. validate options;
2. validate confirmed protection and every nested schema/cross-field invariant;
3. create one complete `verificationAuthority = deepOwnedSnapshotV1(protection)`;
4. derive the result protection payload, replay case values, attack generator projection, historical baseline identity, source IDs, and all later comparisons only from `verificationAuthority`;
5. only then invoke the baseline evaluator.

No later read from the caller-supplied mutable protection object is allowed. Both baseline and improved phases use only `verificationAuthority`.

## 14. M8 Replay Projection

For each bound attack, replay generator projection is exactly:

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

The generator returns exactly `{ version: 1, task: experiment.task, attacks: projectedAttacks }` and must satisfy the full current M8 generator validator before replay execution.

## 15. Stable Evaluator Failure Classification

M10 does not parse error messages or stacks. The M8 boundary used by M10 exposes stable classification:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

Attack `false` is a normal caught result; `returned-false` failure is only a positive-control failure.

## 16. Strict Baseline Gate

Baseline runs first. Improved evaluation never starts until:

- baseline positive control passed;
- complete baseline attack replay succeeded; and
- replay exactly matches bound historical identity.

Historical identity requires exact per-attack classifications, survivor order, and top finding.

`baselineMismatchAttackIds` contains exactly attack IDs whose replayed `evaluatorResult` or `survived` value differs from the bound outcome, in bound attack order. A pure survivor-order and/or top-finding mismatch with identical per-attack classifications yields `baselineMismatchAttackIds: []`.

## 17. Exact Normalized Replay Payload

Whenever a replay completes, `baseline` or `after` is exactly:

```js
{
  outcomes: [
    { attackId, evaluatorResult: "PASS" | "FAIL", survived: true | false }
  ],
  survivorOrderIds: [],
  topFindingId: null
}
```

Outcome order is bound attack order. Survivor order is M8 rank order. Payloads are independently owned snapshots and never expose the full mutable M8 result.

## 18. Uniform Verification Result

Every returned semantic result has exactly these own keys:

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

Fixed values: `version: 1`, `kind: "contract-protection-verification"`. `protection` is exactly an independently owned `{ statement, rationale }` snapshot. All ID/failure arrays satisfy `isExactArrayV1` and use the ordering defined below. No field is omitted and `undefined` is never used.

### 18.1 Partial states

The five partial states have exact `state` strings and fixed facts:

| State | baseline PC | improved PC | baseline | after | mismatch IDs | source caught | improvement | failureReasons |
|---|---|---|---|---|---|---|---|---|
| `baseline-positive-control-failed` | `false` | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-positive-control-failed"]` |
| `baseline-execution-failed` | `true` if failure followed a passed control, otherwise `null` | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-execution-failed"]` |
| `baseline-mismatch` | `true` | `null` | completed normalized replay | `null` | Section 16 definition | `false` | `null` | `["baseline-mismatch"]` |
| `improved-positive-control-failed` | `true` | `false` | completed normalized replay | `null` | `[]` | `false` | `null` | `["improved-positive-control-failed"]` |
| `improved-execution-failed` | `true` | `true` if failure followed a passed improved control, otherwise `null` | completed normalized replay | `null` | `[]` | `false` | `null` | `["improved-execution-failed"]` |

For every partial state: `verificationPassed === false`, `eliminatedAttackIds === []`, `regressionAttackIds === []`.

## 19. Complete Replay Semantics

On a complete improved replay:

```text
sourceFindingCaught = after outcome for sourceAttackId has survived === false
eliminated = baseline survived -> after caught
regression = baseline caught -> after survived
improvement = baseline.survivorOrderIds.length - after.survivorOrderIds.length
```

Diagnostic ID arrays use bound attack order.

Complete state precedence is exactly:

1. if any regression exists: `state = "regression-detected"`, `verificationPassed = false`, failureReasons includes `"regression-detected"`;
2. else if source still survives: `state = "source-finding-still-survives"`, `verificationPassed = false`, failureReasons includes `"source-finding-still-survives"`;
3. otherwise: `state = "verified"`, `verificationPassed = true`, `failureReasons = []`.

If the source is caught while another attack regresses, `sourceFindingCaught === true` and verification still fails.

## 20. Ordering

All diagnostic ID arrays (`baselineMismatchAttackIds`, `eliminatedAttackIds`, `regressionAttackIds`) use bound experiment attack order. `survivorOrderIds` uses M8 rank order. `failureReasons` uses the state/precedence order defined in Sections 18–19 and contains no duplicates.

## 21. Required Proof Matrix

Implementation is not complete until tests prove at least:

- case eligibility is frozen before the first M8 callback;
- async generator/caller mutation cannot change captured case eligibility or authority;
- full candidate experiment stringify/parse is required, including wrapper-depth failure;
- every schema array rejects Proxies, holes, symbols, non-data indices, exotic prototypes, and extra keys;
- embedded contract/rule extra keys reject deterministically;
- literal generator instructions match exactly;
- draft experiment authority is snapshotted before generator invocation;
- generator mutation of caller experiment cannot change draft authority;
- confirmation outputs are deeply independent from draft and decision;
- verification authority is snapshotted before baseline callback;
- baseline mutation of caller protection cannot change Phase B;
- callback acceptance matches Section 2.4 for ordinary/bound/native/async/cross-realm/proxied functions;
- baseline mismatch membership is exact, including ranking-only mismatch yielding `[]`;
- every partial result contains the exact state string and full uniform field set;
- source-caught plus unrelated regression reports source caught `true` and verification failed;
- existing successful M8 behavior remains unchanged except required additive experiment emission.

## 22. Scope and Stopping Rule

Expected implementation touches:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

M10 is implementation-ready only when a fresh exact-head architecture review finds no concrete contradiction or V1 implementation-choice ambiguity in the primitives, schemas, callback acceptance, pre-callback capture, full-artifact wire replayability, ownership chain, replay ordering, or result semantics.

Out of scope: lossless arbitrary graph/prototype serialization, cryptographic provenance, provider adapters, dashboards, production-model execution, AI-generated executable code, automatic patching, universal future-attack proof, and unrelated engine redesign.
