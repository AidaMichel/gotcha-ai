# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 9
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal

M10 closes the confirmed-contract remediation loop without turning AI output into executable evaluator policy.

```text
M8 successful attack run
  -> emit exact replayable OR non-replayable experiment
  -> validate exact experiment + selected source
  -> invoke declarative protection generator
  -> human accept / edit / reject
  -> caller supplies trusted improved evaluator
  -> baseline replay + exact historical identity gate
  -> only then improved replay
  -> source closure + regression verification
```

AI output remains declarative. Human confirmation is mandatory. The caller owns executable evaluator code. Gotcha owns artifact binding, replay eligibility, validation, phase ordering, and deterministic verification results.

## 2. Authority Boundary

M10 never executes model-generated JavaScript, callbacks, ASTs, shell commands, patches, evaluator code, or contract edits.

Trusted executable callbacks are:

```js
generator(input) -> value | native Promise<value>
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

Generator return data is untrusted. The baseline evaluator is a compatibility witness, not historical authority.

## 3. Required M8 Experiment Emission

Every successful `runContractAttacks()` call MUST return an own `experiment` field containing exactly one of two v1 variants.

### 3.1 Replayable experiment

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
      strategy: "json-stable-local-plain-data-v1"
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

Exact top-level own keys are `version`, `kind`, `replayable`, `task`, `contract`, `case`, `attacks`, `baseline`.

`case` exact own keys are `input`, `expectedOutput`, `replay`.

`case.replay` exact own keys are `version`, `kind`, `strategy` with the exact values above.

### 3.2 Non-replayable experiment

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: false,
  task,
  reason: {
    code: "EVALUATOR_CASE_NOT_CANONICALLY_REPLAYABLE"
  }
}
```

Exact top-level own keys are `version`, `kind`, `replayable`, `task`, `reason`. `reason` has exactly `code`.

No contract, case, attacks, baseline, replay metadata, or free-form reason text is present. `draftContractProtection()` rejects this variant before generator invocation.

## 4. Revision 9 Replayability Rule — JSON-Stable Local Plain Data

Replayability is decided structurally at the M8 boundary and is intentionally narrower than general M8 AI-data validity.

M8 applies `isJsonStableLocalPlainDataV1(value)` independently to the original pre-canonicalization `input`, original pre-canonicalization `expectedOutput`, and every retained attack `output`.

A successful M8 run emits `replayable: true` if and only if all of those values pass. Otherwise it emits the non-replayable variant.

This rule deliberately guarantees that the evaluator-facing values survive the supported serialized/reloaded artifact flow without semantic drift that M10 claims to preserve.

### 4.1 Exact predicate

`isJsonStableLocalPlainDataV1` is recursive, getter-free, Proxy-rejecting, and repeated-identity/cycle-rejecting. It uses captured untampered intrinsics and own-property descriptors.

Eligible scalars are exactly:

- `null`
- string
- boolean
- finite number

Ineligible scalars include `undefined`, bigint, symbol, function, `NaN`, `Infinity`, and `-Infinity`.

An Array is eligible only when all of these hold:

1. `Array.isArray(value) === true`.
2. `Object.getPrototypeOf(value) === Array.prototype` from Gotcha's local realm.
3. Own keys are exactly ordinary canonical array-index strings plus `"length"`.
4. Every integer index from `0` through `length - 1` exists as an own enumerable data property.
5. Therefore sparse arrays are ineligible.
6. No symbol or extra named property exists.
7. Every element recursively passes.
8. The array object has not been encountered previously in the current traversal.

A plain object is eligible only when all of these hold:

1. `Object.getPrototypeOf(value) === Object.prototype` from Gotcha's local realm.
2. Null-prototype objects are ineligible in V1.
3. Every own key is a string.
4. Every own property is an enumerable data property.
5. No symbol key exists.
6. Every property value recursively passes.
7. The object has not been encountered previously in the current traversal.

All cross-realm objects, custom prototypes, null-prototype objects, Date, Map, Set, RegExp, typed arrays, ArrayBuffer/DataView, Promise, Proxy, accessor-bearing objects, functions, sparse arrays, repeated object identities, and cycles are ineligible.

The repeated-identity rule applies across the entire value being checked, so `{ a: shared, b: shared }` is ineligible even when `shared` itself is plain data.

### 4.2 Artifact round-trip invariant

For every value admitted by this predicate, M10 defines its supported wire representation as ordinary JSON data using `JSON.stringify` followed by `JSON.parse` under captured untampered intrinsics.

Replayable validation MUST require that:

- serialization completes without invoking user getters because eligibility was already descriptor-validated;
- deserialization produces the same allowed structural class: local ordinary Objects, dense local Arrays, and eligible scalars only;
- M8 deep equality between the canonical in-memory snapshot and the parsed snapshot is true;
- no prototype, sparsity, shared identity, cycle, symbol, accessor, or exotic semantic is required to reproduce evaluator behavior.

M10 does not claim to preserve any semantic that this wire representation cannot preserve. Such runs are non-replayable V1.

## 5. Independent Experiment Ownership

Replayable experiment data MUST be deeply independently owned from mutable legacy M8 result fields including `generatedAttacks`, `attack.results`, `survivors`, and `topFinding`.

Mutating any legacy public result after return must not alter `experiment` or later replay behavior.

The experiment's case values and attack outputs must also satisfy Section 4 after any serialized/reloaded revalidation.

## 6. Exact Replayable Attack Schema

Each `experiment.attacks` element has exactly:

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

Nested `rule` has exactly `id`, `statement`, `kind`, `severity`.

Validation requires:

- attack count `0..20` inclusive;
- unique non-empty `id`;
- non-empty `ruleId`, `type`, `description`, `rationale`;
- referenced rule is active and exactly matches the embedded authority snapshot;
- `output` passes both current M8 AI-safe data validation and Section 4's stricter JSON-stable replay predicate;
- `severity`, `realism`, `subtlety`, `novelty`, `fixability` are finite `[0,1]` numbers;
- severity equals the contract-derived value;
- output differs from bound expected output under M8 deep equality;
- no same-rule/deep-equal retained duplicate exists.

### 6.1 Exact M8 replay projection

Each attack projects exactly to:

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

The replay generator returns exactly:

```js
{
  version: 1,
  task: experiment.task,
  attacks: experiment.attacks.map(projectForM8Replay)
}
```

Before generator drafting, the projection MUST satisfy the full current M8 generator validator. M10 may not knowingly validate a weaker replay schema than M8.

## 7. Exact Bound Baseline Schema

Each `experiment.baseline.outcomes` element is exactly:

```js
{
  attackId,
  evaluatorResult: "PASS" | "FAIL",
  survived: true | false
}
```

`baseline` exact own keys are `outcomes`, `survivorOrderIds`, `topFindingId`.

Requirements:

- exactly one unique outcome per bound attack and no extras;
- `evaluatorResult === "PASS"` iff `survived === true`;
- `survivorOrderIds` is a duplicate-free permutation of exactly survived IDs in deterministic M8 rank order;
- `topFindingId` is first survivor ID or `null`.

## 8. Exact Public API Options Objects

All three APIs validate their options container before reading semantic values.

Each options object MUST:

- not be a Proxy;
- have prototype exactly local `Object.prototype` or `null`;
- contain exactly the required own string keys and no symbols;
- expose each required key as an enumerable own data property;
- contain no accessors, extras, or non-enumerable fields.

Semantic values are taken from validated descriptors, not ordinary property access.

Exact options:

```js
// draftContractProtection
{ experiment, sourceAttackId, generator }

// confirmContractProtection
{ draft, decision }

// verifyContractProtection
{ protection, evaluator, improvedEvaluator }
```

`generator`, `evaluator`, and `improvedEvaluator` must be callable trusted local functions. Malformed options reject before any callback executes.

## 9. Drafting Input and Source Selection

`draftContractProtection()` accepts only an exact replayable v1 experiment and fully validates it before generator execution.

`sourceAttackId` must be a non-empty string resolving to exactly one bound attack whose original baseline outcome has `survived: true`.

The generator receives an independently owned snapshot with exactly:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  instructions
}
```

`finding` is exactly the selected bound attack schema.

`instructions` is exactly:

```text
The confirmed Quality Contract and selected rule are authoritative. Propose one narrow declarative evaluator-protection intent for the selected finding. Preserve unrelated correct behavior. Prefer a rule-level protection over exact-output blacklisting. Return only the required declarative schema. Do not return executable code, callbacks, ASTs, shell commands, patches, contract edits, rule-authority edits, or claims that the protection is already proven effective. Do not claim the production model produced the attack candidate.
```

## 10. Protection Generator Async Contract

The generator is invoked exactly once after all pre-generator validation succeeds.

1. Call `generator(generatorInput)` synchronously inside a `try` boundary.
2. A synchronous throw rejects with the same thrown value.
3. Detect genuine native Promise using the captured side-effect-free native-Promise brand check used by M8.
4. If and only if the result is a genuine native Promise, await it once.
5. Native-Promise rejection propagates unchanged.
6. Arbitrary thenables are never assimilated and `.then` is never invoked by M10.
7. Direct values and native-Promise fulfillment values are then validated as exact generator output.

## 11. Exact Generator Output

Only this shape is accepted:

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

Exact keys are those shown. `statement` and `rationale` are non-empty strings. Task/source/rule IDs must exactly match bound authority. The whole value must pass AI-safe validation. Extra fields, accessors, Proxies, functions, unsupported exotics, patches, callbacks, or authority edits reject.

## 12. Draft / Decision / Confirmed / Rejected Artifacts

### 12.1 Exact artifact shape

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

All shown own keys and nested keys are exact.

### 12.2 Exact decisions

Exactly one of:

```js
{ type: "accept" }
{ type: "edit", statement: "non-empty human-authored statement" }
{ type: "reject" }
```

Decision objects use the same non-Proxy/plain/data-property boundary rules. Edit changes only `protection.statement`; rationale remains unchanged.

### 12.3 Revision 9 ownership rule

`confirmContractProtection()` MUST NOT mutate the supplied draft and MUST NOT retain any mutable object/array reference reachable from the draft or decision in its returned artifact.

For accept, edit, and reject, it MUST construct a deep independently owned snapshot from already-validated draft/decision data.

After return:

- mutating any part of the original draft cannot change the confirmed/rejected artifact;
- mutating the decision object cannot change the returned artifact;
- mutating the returned artifact cannot change the original draft;
- nested `experiment`, `source`, `rule`, `protection`, contract data, case data, attacks, attack outputs, baseline outcomes, and all arrays are independently owned.

Rejected artifacts cannot verify.

### 12.4 Cross-field binding invariants

Every draft, confirmed, and rejected artifact MUST satisfy from data:

- `task === experiment.task === experiment.contract.task`;
- `experiment` is exact replayable v1;
- `source.attackId` resolves to exactly one bound attack;
- that attack has exactly one bound baseline outcome with `survived === true`;
- `source.ruleId === selectedAttack.ruleId`;
- `rule.id === source.ruleId === selectedAttack.rule.id`;
- `rule.statement`, `rule.kind`, and `rule.severity` equal the selected attack rule snapshot;
- that rule snapshot equals the active confirmed rule inside `experiment.contract` across `id`, `statement`, `kind`, `severity`;
- protection text cannot alter task/source/rule/experiment authority.

Confirmation revalidates these invariants before applying the decision. Verification revalidates them again before invoking either evaluator.

Serialized/reloaded artifacts are revalidated entirely from data. Object identity is never authority, but Section 4 forbids replayable values whose semantics depend on identity/prototype information not preserved by the supported wire form.

## 13. Verification Architecture

Verification fully revalidates exact options, the confirmed artifact, cross-field bindings, and embedded replayable experiment before invoking either evaluator.

It reconstructs fresh local JSON-stable clones of the bound case and replay attack outputs from the artifact wire-safe snapshots, constructs the exact replay generator, and invokes the existing `runContractAttacks()` boundary.

No provider/model call occurs during verification.

## 14. Stable M8 Evaluator Failure Classification

M10 MUST NOT parse error messages or stacks.

The M8 boundary used by M10 must expose stable internal/additive classification:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

`returned-false` is valid only for positive control because attack `false` is a normal caught classification.

## 15. Positive-Control Truth

Every semantic result contains:

```text
baselinePositiveControlPassed
improvedPositiveControlPassed
```

Each is `true | false | null`:

- `true`: the phase control returned boolean true, even if a later attack aborted;
- `false`: the phase control returned boolean false;
- `null`: the control threw, returned non-boolean, or the phase did not run.

Completed control truth is never erased by later attack failure.

## 16. Strict Baseline Gate

Baseline always runs first. `improvedEvaluator` MUST NOT run until exact baseline identity passes.

Terminal baseline states:

- `baseline-positive-control-failed` when baseline control returns false;
- `baseline-execution-failed` when baseline control throws/non-boolean or a later baseline attack evaluation aborts;
- `baseline-mismatch` when a complete replay differs from bound classifications, survivor order, or top finding.

If baseline attack evaluation fails after the control passed, `baselinePositiveControlPassed === true`.

A complete baseline mismatch returns the normalized baseline snapshot and does not run Phase B.

## 17. Strict Improved Phase

Phase B runs only after baseline identity passes.

Terminal partial states:

- `improved-positive-control-failed` when improved control returns false;
- `improved-execution-failed` when improved control throws/non-boolean or later improved attack evaluation aborts.

If improved attack evaluation fails after its control passed, `improvedPositiveControlPassed === true`.

## 18. Exact Non-Null Replay Result Payload

Whenever `baseline` or `after` is non-null, it is a deep independent snapshot with exactly:

```js
{
  outcomes: [
    {
      attackId,
      evaluatorResult: "PASS" | "FAIL",
      survived: true | false
    }
  ],
  survivorOrderIds: [],
  topFindingId: null
}
```

Rules:

- outcomes contain every bound attack exactly once and no extras, in bound experiment attack order;
- `evaluatorResult === "PASS"` iff `survived === true`;
- `survivorOrderIds` is duplicate-free deterministic M8 rank order;
- `topFindingId` is first survivor or `null`;
- no full M8 result, mutable attack result, experiment reference, callback, stack, or error object is exposed;
- normalization produces deep independent snapshots.

## 19. Uniform Verification Result Schema

Every valid-artifact semantic outcome returns exactly:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,
  baseline,
  after,
  baselineIdentityPassed,
  baselineMismatchAttackIds,
  baselineExecutionError,
  baselinePositiveControlPassed,
  improvedPositiveControlPassed,
  sourceFindingReproduced,
  sourceFindingCaught,
  improvement,
  eliminatedAttackIds,
  regressionAttackIds,
  verificationPassed,
  failureReasons,
  state
}
```

`protection` is exactly a deep independent `{ statement, rationale }` snapshot.

`baselineExecutionError` is `null` or exactly `{ code: "BASELINE_EVALUATOR_EXECUTION_FAILED" }`.

Malformed options/artifacts reject and do not return this semantic result.

## 20. Partial-State Fixed Values

For `baseline-positive-control-failed`:

```text
baseline = null
after = null
baselineIdentityPassed = false
baselineMismatchAttackIds = []
baselineExecutionError = null
baselinePositiveControlPassed = false
improvedPositiveControlPassed = null
sourceFindingReproduced = false
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["baseline-positive-control-failed"]
```

For `baseline-execution-failed`:

```text
baseline = null
after = null
baselineIdentityPassed = false
baselineMismatchAttackIds = []
baselineExecutionError = { code: "BASELINE_EVALUATOR_EXECUTION_FAILED" }
improvedPositiveControlPassed = null
sourceFindingReproduced = false
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["baseline-execution-failed"]
```

`baselinePositiveControlPassed` is `null` for control throw/non-boolean and `true` for attack-evaluation failure after a passed control.

For `baseline-mismatch`:

```text
baseline = completed normalized replay
after = null
baselineIdentityPassed = false
baselineExecutionError = null
baselinePositiveControlPassed = true
improvedPositiveControlPassed = null
sourceFindingReproduced = false
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["baseline-mismatch"]
```

For `improved-positive-control-failed`:

```text
baseline = completed normalized replay
after = null
baselineIdentityPassed = true
baselineMismatchAttackIds = []
baselineExecutionError = null
baselinePositiveControlPassed = true
improvedPositiveControlPassed = false
sourceFindingReproduced = true
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["improved-positive-control-failed"]
```

For `improved-execution-failed`:

```text
baseline = completed normalized replay
after = null
baselineIdentityPassed = true
baselineMismatchAttackIds = []
baselineExecutionError = null
baselinePositiveControlPassed = true
sourceFindingReproduced = true
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["improved-execution-failed"]
```

`improvedPositiveControlPassed` is `null` for improved control throw/non-boolean and `true` for later attack-evaluation failure after a passed control.

## 21. Complete Replay Comparison

For complete baseline + after replays:

Source closure requires:

```text
bound source survived
baseline source survived
after source caught
```

Regression is `baseline caught -> after survived`.

Eliminated is `baseline survived -> after caught`.

`sourceFindingReproduced` is always `true` after exact baseline identity passes.

### 21.1 Revision 9 exact `sourceFindingCaught`

For every complete improved replay, regardless of overall verification success:

```js
sourceFindingCaught =
  after.outcomes.find(x => x.attackId === sourceAttackId).survived === false;
```

This field reports only the selected source's after-replay classification. It is independent of regressions elsewhere and independent of `verificationPassed`.

Therefore:

- source caught + unrelated regression => `sourceFindingCaught === true`, `verificationPassed === false`;
- source survives => `sourceFindingCaught === false`;
- partial Phase B states with no complete `after` remain `false` as fixed in Section 20.

`improvement` is exactly:

```js
baseline.survivorOrderIds.length - after.survivorOrderIds.length
```

It is descriptive only.

## 22. Deterministic Diagnostic Ordering

`baselineMismatchAttackIds`, `eliminatedAttackIds`, and `regressionAttackIds` use bound `experiment.attacks` order filtered by membership.

`survivorOrderIds` alone uses deterministic M8 rank order.

## 23. Complete-Replay Failure Precedence

After complete improved replay, compute all applicable failures in this order:

```text
1. regression-detected
2. source-finding-still-survives
```

`failureReasons` contains all applicable reasons in that order. `state` is the first reason.

If none apply:

```text
failureReasons = []
state = verified
verificationPassed = true
```

Complete replay always has:

```text
baselineIdentityPassed = true
baselineMismatchAttackIds = []
baselineExecutionError = null
baselinePositiveControlPassed = true
improvedPositiveControlPassed = true
sourceFindingReproduced = true
```

`sourceFindingCaught` is computed exactly by Section 21.1, not from overall pass/fail.

## 24. Verification Success Gate

`verificationPassed === true` only when:

1. exact options and confirmed artifact validate;
2. artifact ownership/cross-field constraints validate;
3. embedded experiment is exact replayable v1 and all case/attack outputs satisfy Section 4;
4. baseline positive control passes;
5. baseline replay completes;
6. baseline classifications/order/top finding exactly match bound history;
7. improved positive control passes;
8. improved replay completes;
9. selected source changes survived -> caught;
10. no baseline-caught attack regresses to survived.

Unrelated baseline survivors may remain.

## 25. What PASS Proves

A pass proves only:

> On the exact M8-bound JSON-stable replayable case and complete retained attack set, the supplied baseline evaluator reproduced bound M8 history, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove universal correctness, production behavior, future-attack coverage, semantic equivalence between protection prose and evaluator implementation, or cryptographic provenance.

## 26. Required Test Matrix

### Replayability / wire stability

- primitive / ordinary-object / dense-local-array trees replayable;
- local null-prototype objects non-replayable;
- sparse arrays non-replayable;
- cross-realm or custom-prototype objects non-replayable;
- Date/Map/Set/RegExp/typed array/Promise/Proxy/function/accessor non-replayable;
- repeated object identity and cycles non-replayable in input, expected output, and every retained attack output;
- `{ a: shared, b: shared }` attack output forces non-replayable experiment;
- eligible values survive JSON stringify/parse and M8 deep-equality check;
- eligibility never invokes evaluator or getter;
- every successful M8 run emits exactly one experiment variant.

### Public options / generator

- exact three options schemas accepted;
- extra/symbol/accessor/Proxy/exotic options reject before callbacks;
- direct generator return accepted;
- genuine native Promise fulfillment accepted;
- sync throw and native Promise rejection propagate unchanged;
- arbitrary thenable is not awaited and `.then` is never invoked.

### Experiment / artifact authority

- exact schemas and own keys enforced;
- full M8 replay projection validated before generator;
- attack count and required replay fields enforced;
- unchanged and retained-duplicate attacks rejected;
- legacy result mutation cannot alter experiment;
- serialized/reloaded experiment/draft/confirmed artifacts revalidate;
- task/source/rule/survivor cross-field mismatch rejects;
- accept/edit/reject deep-snapshot all nested data;
- mutating original draft after confirmation cannot alter returned confirmed/rejected artifact;
- mutating decision after confirmation cannot alter returned artifact;
- mutating returned artifact cannot alter draft.

### Verification

- baseline control false / control abort / attack abort have exact partial shapes;
- baseline mismatch never calls improved evaluator;
- improved control false / control abort / attack abort have exact partial shapes;
- positive-control true survives later attack failure;
- stable M8 failure classification is used, never message parsing;
- baseline/after use exact normalized independent payloads;
- all diagnostic ID arrays use bound attack order;
- simultaneous regression + source survival uses fixed precedence;
- source caught + unrelated regression yields `sourceFindingCaught === true` and `verificationPassed === false`;
- source survives yields `sourceFindingCaught === false`;
- every semantic result has exact uniform keys.

### Runtime/package

- Node 14 minimum-runtime smoke;
- Node 22 full suite;
- Node 24 full suite;
- deterministic no-key example;
- packed external consumer imports all three M10 APIs.

## 27. Implementation Scope

Expected implementation:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to alter either requires architecture amendment first.

Temporary/dead validation code introduced during implementation must be removed before merge.

## 28. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or V1 implementation-choice ambiguity in:

- JSON-stable replay eligibility for case and attack outputs;
- exact experiment/artifact schemas;
- deep artifact ownership across M8 result -> experiment -> draft -> confirmed/rejected -> verification result;
- serialized/reloaded artifact semantics;
- full M8 replay-schema equivalence;
- public options validation;
- generator async semantics;
- human/AI authority boundaries;
- task/source/rule/survivor cross-field binding;
- stable evaluator failure classification;
- strict baseline-before-improved ordering;
- phase-aware positive-control fields;
- exact baseline/after result payloads;
- exact partial results;
- deterministic ID ordering/failure precedence;
- exact `sourceFindingCaught` semantics;
- source closure/regression/metric semantics.

Out of scope remains lossless graph/prototype serialization, cross-realm replay serialization, cryptographic attestation, provider adapters, dashboards, production-model execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
