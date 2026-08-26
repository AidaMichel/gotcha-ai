# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 13
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal and Authority

M10 turns one confirmed M8 survivor into a human-authorized declarative protection and then verifies an externally supplied improved evaluator against the exact bound M8 experiment.

AI never supplies executable evaluator code. Human confirmation is mandatory. The caller owns executable evaluator changes. Gotcha owns validation, authority snapshots, replay ordering, public completion semantics, and deterministic result semantics.

Public callbacks are exactly:

```js
generator(input) -> value | genuine native Promise<value>
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

The three public M10 APIs always return a genuine local native Promise as defined in Section 10.

## 2. Normative Boundary Primitives

Equivalent internal code is allowed only when externally observable acceptance, rejection, callback execution, serialization, ownership, and completion behavior is identical.

### 2.1 `isExactRecordV1(value, exactKeys)`

A schema record passes only when all are true:

1. `value` is not a Proxy.
2. `Object.getPrototypeOf(value) === Object.prototype` from Gotcha's local realm.
3. `Reflect.ownKeys(value)` contains exactly `exactKeys`, with no extras, omissions, or symbols.
4. Every required key is an enumerable own data property; accessors and non-enumerable schema fields reject.
5. Semantic values are read only from captured own-property descriptors after these checks.

This applies to every schema record in this document, including options, experiments, contracts, rules, case metadata, attacks, baseline records, generator input/output, drafts, decisions, confirmed/rejected artifacts, replay projections, protection payloads, wire-probe envelopes, and verification results.

### 2.2 `isExactArrayV1(value)`

Every schema array passes only when all are true:

1. `value` is not a Proxy.
2. `Array.isArray(value) === true`.
3. `Object.getPrototypeOf(value) === Array.prototype` from Gotcha's local realm.
4. Own keys are exactly canonical indices `0..length-1` plus `"length"`; no holes, symbols, or extra named keys exist.
5. Every indexed property is an enumerable own data property.
6. `length` is the ordinary own array length data property.

This applies to every named schema array, including `rules`, `attacks`, `outcomes`, `survivorOrderIds`, `baselineMismatchAttackIds`, `eliminatedAttackIds`, `regressionAttackIds`, and `failureReasons`.

### 2.3 `deepOwnedSnapshotV1(value)`

A deep owned snapshot contains no mutable Object/Array reference shared with its source graph. For supported V1 artifact data, implementations may use captured safe cloning or a validated wire clone, but the result must preserve the exact V1 semantic value and satisfy the relevant record/array/value schemas.

### 2.4 `isAcceptedCallbackV1(value)`

A callback is accepted iff:

- `typeof value === "function"`; and
- the value is not a Proxy.

No realm or function-kind restriction is imposed. Ordinary, bound, native, async, and cross-realm functions are accepted if non-Proxy. The same rule applies to `generator`, `evaluator`, and `improvedEvaluator`.

### 2.5 `isNonEmptyStringV1(value)`

A required non-empty string passes iff:

```text
typeof value === "string" AND value.trim().length > 0
```

Whitespace-only strings reject. Trimming is used only for the emptiness test; accepted strings are stored and compared byte-for-byte as supplied and are never silently trimmed or normalized.

Every use of “non-empty string” in this spec means `isNonEmptyStringV1` exactly, including task names, IDs, statements, descriptions, rationales, types, and protection text.

### 2.6 `isWireNumberV1(value)`

A serialized numeric value passes iff:

```text
typeof value === "number"
Number.isFinite(value) === true
Object.is(value, -0) === false
```

Every non-literal numeric field serialized by M10 V1 uses this primitive. Exact literal integers such as `version: 1` are validated against the literal value itself. No serialized V1 numeric field may preserve `-0` as authority.

## 3. Wire-Replayable Value Predicate

`isWireValueV1(value)` is intentionally narrower than general M8 AI-data support.

Allowed scalars are exactly:

- `null`;
- string;
- boolean;
- number satisfying `isWireNumberV1`.

Allowed arrays must satisfy `isExactArrayV1`, contain only recursively allowed values, and contain no repeated object identity or cycle.

Allowed plain data objects must:

- be non-Proxy;
- have local `Object.prototype` exactly;
- contain only string own keys;
- expose every own property as an enumerable data property;
- contain no symbols;
- contain only recursively allowed values;
- contain no repeated object identity or cycle.

Therefore `undefined`, bigint, symbol, functions, accessors, null-prototype objects, cross-realm/custom prototypes, sparse arrays, repeated/shared identity, cycles, Date, Map, Set, RegExp, Promise, typed arrays, ArrayBuffer/DataView, non-finite numbers, and negative zero are non-replayable V1.

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

`task` satisfies `isNonEmptyStringV1`. `rules` satisfies `isExactArrayV1`, contains at least one and no more than current M8 `MAX_RULES`, and contains exact rule records:

```js
{
  id,
  statement,
  kind,
  severity
}
```

Rule exact keys are `id`, `statement`, `kind`, `severity`.

`id` and `statement` satisfy `isNonEmptyStringV1`. Rule IDs are unique. `kind` is exactly one of `required`, `forbidden`, `conditional`. `severity` is exactly one of `critical`, `major`, `minor`.

M10 accepts no extra contract or rule keys even if the current M8 normalizer would otherwise discard them.

## 5. Pre-Callback M8 Capture

Before the first evaluator or generator callback of a `runContractAttacks()` attempt, M8 MUST:

1. validate the confirmed contract;
2. determine structural V1 eligibility of the original pre-canonicalization `input` and `expectedOutput`;
3. capture independently owned canonical evaluator-case snapshots used for any later experiment emission;
4. freeze the eligibility decision for those case values for the lifetime of the run.

Later caller/generator mutation of original case objects cannot change replayability classification or emitted case authority.

Each retained attack output is validated and independently snapshotted at retention time before its evaluator attack callback can affect later artifact construction.

## 6. Required Experiment Variants

Every successful M8 run emits exactly one own `experiment` field.

### 6.1 Non-replayable

If case eligibility fails, any retained attack output fails `isWireValueV1`, any serialized attack numeric field fails `isWireNumberV1`, or the protection-depth wire probe in Section 7 fails, emit exactly:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: false,
  task,
  reason: { code: "EXPERIMENT_NOT_WIRE_REPLAYABLE" }
}
```

Exact keys are those shown. `task` satisfies `isNonEmptyStringV1`. `reason` has exactly `code`. No contract/case/attacks/baseline payload is exposed. Drafting rejects this variant before generator invocation.

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

## 7. Protection-Depth Wire Probe and `toJSON` Hardening

Replayability is not established by probing bare nested values or the experiment alone.

After the successful M8 baseline run has produced retained attacks and bound outcomes, M8 constructs one complete independently owned replayable-candidate experiment using only the frozen pre-callback case snapshots and retained-output snapshots.

To reserve the exact additional JSON nesting level used when the experiment is later embedded in a draft/confirmed/rejected `contract-protection` artifact, M8 then constructs this exact wire-probe envelope:

```js
{
  experiment: completeCandidateExperiment
}
```

The envelope is an exact local record with the sole own key `experiment`. Its only purpose is to test the maximum later artifact depth. A real protection artifact adds sibling fields but does not add any deeper path beneath `experiment`; therefore any experiment that survives this envelope probe has sufficient JSON nesting headroom for the later standalone protection artifact.

Immediately before serialization, while no user callback is executing, M8 MUST verify from captured own-property descriptors that:

```text
Object.prototype has no own "toJSON" property
Array.prototype has no own "toJSON" property
```

If either property exists, regardless of value or enumerability, the probe is unsafe and the run emits the non-replayable variant. `JSON.stringify` is not called in that case.

Only after that check, using captured untampered `JSON.stringify` and `JSON.parse`, M8 executes:

```text
serializedEnvelope = JSON.stringify(wireProbeEnvelope)
parsedEnvelope = JSON.parse(serializedEnvelope)
```

A run is `replayable: true` only if:

1. stringify completes successfully;
2. parse completes successfully;
3. `parsedEnvelope` is an exact `{ experiment }` record;
4. `parsedEnvelope.experiment` revalidates against every exact experiment/record/array/value/numeric schema in this spec;
5. parsed case/attack payloads are M8-deep-equal to candidate snapshots;
6. every serialized non-literal numeric field, including all attack scores, satisfies `isWireNumberV1` both before and after the round trip;
7. all cross-field invariants still hold.

Any failure yields the non-replayable variant.

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

Attack array count is `0..20`. `id`, `ruleId`, `type`, `description`, and `rationale` satisfy `isNonEmptyStringV1`; attack IDs are unique.

`realism`, `subtlety`, `novelty`, and `fixability` each MUST satisfy both:

```text
isWireNumberV1(value)
0 <= value <= 1
```

Thus `-0` is invalid in every score field even though ordinary numeric comparisons would place it inside `[0,1]`.

`attack.severity` is not free input. It MUST equal the exact score derived from `attack.rule.severity`:

```text
critical -> 1.0
major    -> 0.7
minor    -> 0.4
```

These severity scores also satisfy `isWireNumberV1`.

The embedded attack rule must exactly match the active contract rule across `id`, `statement`, `kind`, and `severity`, and `attack.ruleId === attack.rule.id`.

`output` passes current M8 AI-data validation and `isWireValueV1`, differs from `expectedOutput`, and retained attacks contain no same-rule/deep-equal duplicate.

Each baseline outcome is exactly:

```js
{
  attackId,
  evaluatorResult: "PASS" | "FAIL",
  survived: true | false
}
```

`attackId` satisfies `isNonEmptyStringV1`.

`experiment.baseline.outcomes` MUST be in exact bound `experiment.attacks` order: element `i` has `attackId === experiment.attacks[i].id`. There is exactly one outcome per attack and no extras. `evaluatorResult === "PASS"` iff `survived === true`.

`survivorOrderIds` is the duplicate-free ordered list of exactly survived attack IDs in M8 rank order. `topFindingId` equals its first element or `null`.

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

`sourceAttackId` satisfies `isNonEmptyStringV1`. Callbacks use `isAcceptedCallbackV1`.

Malformed call shapes execute zero callbacks and reject the returned Promise with `TypeError` as defined in Section 10.

## 10. Exact Public API Completion Contract

All three public APIs have one completion model.

On every invocation they MUST:

1. create a genuine native Promise using captured local Promise intrinsics;
2. return that Promise to the caller;
3. perform validation and operation work in a native Promise continuation, so no boundary-validation error or callback invocation occurs synchronously before the Promise is returned.

Therefore the public functions never return a direct artifact/result and never expose a synchronous validation throw channel.

Exact completion behavior is:

### 10.1 `draftContractProtection(options)`

- always returns a genuine local native Promise;
- structural/schema/value/authority validation failure rejects that Promise with `TypeError`;
- a synchronous generator throw rejects that Promise with the exact thrown value;
- a genuine native generator Promise rejection rejects with the exact rejection reason;
- valid completion resolves to exactly one artifact with `status: "draft"`;
- arbitrary thenables are treated as direct values and are never assimilated.

### 10.2 `confirmContractProtection(options)`

- always returns a genuine local native Promise;
- structural/schema/value/status/decision validation failure rejects that Promise with `TypeError`;
- valid completion resolves to exactly one independently owned artifact with status determined by Section 13;
- it invokes no user callback.

### 10.3 `verifyContractProtection(options)`

- always returns a genuine local native Promise;
- structural/schema/value/status/authority validation failure rejects that Promise with `TypeError`;
- evaluator failures covered by Section 16 are semantic verification outcomes and therefore resolve to the corresponding uniform result rather than reject;
- valid complete verification resolves to the uniform result in Sections 19–20.

Error message text is non-authoritative; the channel and `TypeError` class for boundary validation are authoritative.

## 11. Drafting Ordering and Generator Input Isolation

Inside the asynchronous operation body defined by Section 10, `draftContractProtection()` performs this exact order:

1. validate options;
2. validate a replayable experiment completely;
3. require `sourceAttackId` to identify exactly one bound baseline survivor;
4. create `experimentAuthority = deepOwnedSnapshotV1(experiment)`;
5. derive source/rule/case values only from `experimentAuthority`;
6. construct one separate `generatorInput = deepOwnedSnapshotV1({ contract, input, expectedOutput, finding, instructions })`;
7. verify that no mutable Object/Array reachable from `generatorInput` is reference-identical to any mutable Object/Array reachable from `experimentAuthority`;
8. invoke the generator once with only `generatorInput`;
9. consume generator completion according to Section 12;
10. validate generator output;
11. construct the draft from a fresh independently owned snapshot of `experimentAuthority` plus a fresh independently owned snapshot of validated generator output;
12. set the returned artifact status exactly to `"draft"`.

The generator can mutate its `contract`, `input`, `expectedOutput`, or `finding` arguments without changing `experimentAuthority` or the authority later embedded in the draft.

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

`finding` is the selected exact attack record. Every mutable member of the entire generator input is independently owned from `experimentAuthority`.

`instructions` is exactly this literal string:

```text
The confirmed Quality Contract and selected rule are authoritative. Propose one narrow declarative evaluator-protection intent for the selected finding. Preserve unrelated correct behavior. Prefer a rule-level protection over exact-output blacklisting. Return only the required declarative schema. Do not return executable code, callbacks, ASTs, shell commands, patches, contract edits, rule-authority edits, or claims that the protection is already proven effective. Do not claim the production model produced the attack candidate.
```

## 12. Generator Completion Semantics

After all pre-generator validation and authority/input snapshotting:

1. invoke `generator(generatorInput)` once;
2. if it throws synchronously, reject the outer drafting Promise with that exact thrown value;
3. only a genuine native Promise recognized by the captured side-effect-free M8 Promise brand probe is awaited;
4. native-Promise rejection rejects the outer drafting Promise with the same reason;
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

`task`, `sourceAttackId`, `ruleId`, `protection.statement`, and `protection.rationale` satisfy `isNonEmptyStringV1`. All authority IDs must match `experimentAuthority`. No executable values or extra keys are accepted.

## 13. Draft, Decision, Confirmation, Rejection

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

Every nested record/array is validated by Sections 2–8. Every textual field described as non-empty uses `isNonEmptyStringV1`.

`draftContractProtection()` MUST return only `status: "draft"`.

`confirmContractProtection()` MUST accept only an artifact whose status is exactly `"draft"`. Passing a `confirmed` or `rejected` artifact as `draft` is invalid and rejects with `TypeError`; reconfirmation is not supported.

Decisions are exactly one of:

```js
{ type: "accept" }
{ type: "edit", statement }
{ type: "reject" }
```

For `edit`, `statement` satisfies `isNonEmptyStringV1`.

Decision-to-status mapping is normative:

```text
accept -> returned artifact status === "confirmed"
edit   -> returned artifact status === "confirmed"
reject -> returned artifact status === "rejected"
```

`edit` changes only `protection.statement`; the generator rationale remains unchanged. A confirmed artifact may verify. A rejected artifact cannot verify. Confirmation never returns `draft`.

`confirmContractProtection()` revalidates the complete draft before applying the decision and always resolves to a `deepOwnedSnapshotV1` result sharing no mutable nested reference with the supplied draft or decision.

Cross-field invariants at draft, confirmation, and verification are:

```text
task === experiment.task === experiment.contract.task
source.attackId -> exactly one bound original survivor
source.ruleId === selectedAttack.ruleId
rule.id === source.ruleId === selectedAttack.rule.id
rule statement/kind/severity === selected attack rule snapshot
selected attack rule snapshot === active embedded contract rule
```

## 14. Verification Authority Snapshot

`verifyContractProtection()` accepts only `status: "confirmed"`.

Inside the asynchronous operation body it performs this exact order:

1. validate options;
2. validate confirmed protection and every nested schema/cross-field invariant;
3. create one complete `verificationAuthority = deepOwnedSnapshotV1(protection)`;
4. derive result protection payload, replay case values, attack generator projection, historical baseline identity, source IDs, and all later comparisons only from `verificationAuthority`;
5. only then invoke the baseline evaluator.

No later read from the caller-supplied mutable protection object is allowed. Both baseline and improved phases use only `verificationAuthority`.

## 15. M8 Replay Projection

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

The generator returns exactly `{ version: 1, task: experiment.task, attacks: projectedAttacks }` and must satisfy the full current M8 generator validator before replay execution. M8 recomputes severity from rule authority, which is why Section 8 binds stored numeric `attack.severity` to the exact rule-severity mapping.

## 16. Stable Evaluator Failure Classification

M10 does not parse error messages or stacks. The M8 boundary used by M10 exposes stable classification:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

Attack `false` is a normal caught result; `returned-false` failure is only a positive-control failure.

These classified evaluator failures resolve the verification Promise with the semantic partial states in Section 19.1; they do not reject the public Promise.

## 17. Strict Baseline Gate

Baseline runs first. Improved evaluation never starts until:

- baseline positive control passed;
- complete baseline attack replay succeeded; and
- replay exactly matches bound historical identity.

Historical identity requires exact per-attack classifications, survivor order, and top finding.

`baselineMismatchAttackIds` contains exactly attack IDs whose replayed `evaluatorResult` or `survived` value differs from the bound outcome, in bound attack order. A pure survivor-order and/or top-finding mismatch with identical per-attack classifications yields `baselineMismatchAttackIds: []`.

## 18. Exact Normalized Replay Payload

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

## 19. Uniform Verification Result

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

Fixed values: `version: 1`, `kind: "contract-protection-verification"`. `task`, `sourceAttackId`, and `sourceRuleId` satisfy `isNonEmptyStringV1`. `protection` is exactly an independently owned `{ statement, rationale }` snapshot whose strings satisfy `isNonEmptyStringV1`. All ID/failure arrays satisfy `isExactArrayV1`. No field is omitted and `undefined` is never used.

`improvement`, when non-null, is an integer derived from array lengths and MUST satisfy `isWireNumberV1`.

### 19.1 Partial states

The five partial states have exact `state` strings and fixed facts:

| State | baseline PC | improved PC | baseline | after | mismatch IDs | source caught | improvement | failureReasons |
|---|---|---|---|---|---|---|---|---|
| `baseline-positive-control-failed` | `false` | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-positive-control-failed"]` |
| `baseline-execution-failed` | `true` if failure followed a passed control, otherwise `null` | `null` | `null` | `null` | `[]` | `false` | `null` | `["baseline-execution-failed"]` |
| `baseline-mismatch` | `true` | `null` | completed normalized replay | `null` | Section 17 definition | `false` | `null` | `["baseline-mismatch"]` |
| `improved-positive-control-failed` | `true` | `false` | completed normalized replay | `null` | `[]` | `false` | `null` | `["improved-positive-control-failed"]` |
| `improved-execution-failed` | `true` | `true` if failure followed a passed improved control, otherwise `null` | completed normalized replay | `null` | `[]` | `false` | `null` | `["improved-execution-failed"]` |

For every partial state: `verificationPassed === false`, `eliminatedAttackIds === []`, and `regressionAttackIds === []`.

## 20. Complete Replay Semantics

On a complete improved replay:

```text
sourceFindingCaught = after outcome for sourceAttackId has survived === false
eliminated = baseline survived -> after caught
regression = baseline caught -> after survived
improvement = baseline.survivorOrderIds.length - after.survivorOrderIds.length
```

Diagnostic ID arrays use bound attack order.

State precedence is exact:

1. if any regression exists: `state = "regression-detected"`, `verificationPassed = false`;
2. else if source still survives: `state = "source-finding-still-survives"`, `verificationPassed = false`;
3. otherwise: `state = "verified"`, `verificationPassed = true`.

`failureReasons` membership is independently exact and reports every applicable complete-replay failure in this canonical order:

```text
if regression exists AND source still survives:
  ["regression-detected", "source-finding-still-survives"]

if regression exists AND source is caught:
  ["regression-detected"]

if no regression exists AND source still survives:
  ["source-finding-still-survives"]

if no regression exists AND source is caught:
  []
```

Thus state follows precedence while `failureReasons` does not discard a simultaneously true lower-precedence failure. If the source is caught while another attack regresses, `sourceFindingCaught === true` and verification still fails.

## 21. Ordering

All diagnostic ID arrays (`baselineMismatchAttackIds`, `eliminatedAttackIds`, `regressionAttackIds`) use bound experiment attack order. `experiment.baseline.outcomes` and normalized replay `outcomes` also use bound attack order. `survivorOrderIds` uses M8 rank order. `failureReasons` uses the exact order in Sections 19–20 and contains no duplicates.

## 22. Required Proof Matrix

Implementation is not complete until tests prove at least:

- `isNonEmptyStringV1` rejects empty and whitespace-only strings while preserving accepted string bytes;
- negative zero is non-replayable in case/output values and rejected in every attack score field;
- ordinary finite score `0` remains valid;
- case eligibility is frozen before the first M8 callback;
- async generator/caller mutation cannot change captured case eligibility or authority;
- the wire probe serializes `{ experiment: completeCandidateExperiment }`, proving one protection-artifact wrapper level of nesting headroom;
- a near-runtime-depth experiment that fits alone but fails inside the envelope is non-replayable;
- an own `toJSON` on local `Object.prototype` or `Array.prototype` makes the wire probe non-replayable and no inherited `toJSON` executes;
- every schema array rejects Proxies, holes, symbols, non-data indices, exotic prototypes, and extra keys;
- embedded contract/rule extra keys reject deterministically;
- attack numeric severity exactly matches `critical=1.0`, `major=0.7`, `minor=0.4` and altered in-range severity rejects;
- experiment baseline outcomes are required in exact bound attack order;
- all three public APIs immediately return genuine local native Promises and never direct values;
- malformed options reject asynchronously with `TypeError` and execute zero callbacks;
- generator synchronous throw/native-Promise rejection reject the drafting Promise through the exact callback error channel;
- evaluator execution failures resolve semantic verification states rather than reject;
- literal generator instructions match exactly;
- experiment authority is snapshotted before generator invocation;
- every mutable generator-input member is independently owned from experiment authority;
- generator mutation of contract/input/expectedOutput/finding cannot change draft authority;
- drafting resolves only `status: "draft"`;
- confirmation rejects confirmed/rejected inputs and accepts only `status: "draft"`;
- accept/edit resolve confirmed, reject resolves rejected;
- confirmation outputs are deeply independent from draft and decision;
- verification accepts only confirmed artifacts and snapshots authority before baseline callback;
- baseline mutation of caller protection cannot change Phase B;
- callback acceptance matches Section 2.4 for ordinary/bound/native/async/cross-realm/proxied functions;
- baseline mismatch membership is exact, including ranking-only mismatch yielding `[]`;
- every partial result contains the exact state string and full uniform field set;
- simultaneous regression + source survival emits both exact failure reasons in canonical order;
- source-caught plus unrelated regression reports source caught `true` and verification failed;
- existing successful M8 behavior remains unchanged except required additive experiment emission.

## 23. Scope and Stopping Rule

Expected implementation touches:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

M10 is implementation-ready only when a fresh exact-head architecture review finds no concrete contradiction or V1 implementation-choice ambiguity in the primitives, schemas, public completion contract, callback acceptance, pre-callback capture, protection-depth wire replayability, ownership chain, replay ordering, or result semantics.

Out of scope: lossless arbitrary graph/prototype serialization, cryptographic provenance, provider adapters, dashboards, production-model execution, AI-generated executable code, automatic patching, universal future-attack proof, and unrelated engine redesign.