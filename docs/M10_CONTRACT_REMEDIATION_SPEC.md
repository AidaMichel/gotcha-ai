# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 8
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal

M10 closes the confirmed-contract remediation loop without turning model output into executable evaluator policy.

```text
M8 successful contract attack run
  ↓
M8 deterministically emits replayable OR non-replayable experiment
  ↓
IF replayable: validate exact artifact + source
  ↓
invoke declarative protection generator under exact async contract
  ↓
human accept / edit / reject
  ↓
caller supplies trusted improved evaluator
  ↓
baseline replay and exact historical-identity gate
  ↓
ONLY THEN improved replay
  ↓
source closure + regression verification
```

AI output remains declarative. Human confirmation is mandatory. The caller owns executable evaluator code. Gotcha owns binding, replay eligibility, validation, phase ordering, and deterministic verification results.

---

## 2. Authority Boundary

M10 never executes model-generated JavaScript, callbacks, ASTs, shell commands, patches, evaluator code, or contract edits.

Trusted local executable callbacks are:

```js
generator(input) -> value | native Promise<value>
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

Generator return data is untrusted. The baseline evaluator is a compatibility witness, not historical authority.

---

## 3. Required M8 Experiment Emission

Every successful `runContractAttacks()` call MUST return an own `experiment` field. Exactly two v1 variants exist.

### 3.1 Replayable variant

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
      strategy: "canonical-local-plain-data-v1"
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

Exact top-level own keys:

```text
version
kind
replayable
task
contract
case
attacks
baseline
```

`case` exact own keys: `input`, `expectedOutput`, `replay`.

`case.replay` exact own keys: `version`, `kind`, `strategy`, with the exact values above.

### 3.2 Non-replayable variant

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

Exact top-level own keys: `version`, `kind`, `replayable`, `task`, `reason`.

`reason` exact own key: `code`.

No contract, case, attack, baseline, replay metadata, or free-form reason text is present in this variant. `draftContractProtection()` rejects it before generator invocation.

---

## 4. Deterministic Replay Eligibility Algorithm

Replayability is selected at the M8 boundary by structure only. It does NOT depend on an evaluator callback, observational testing, heuristic comparison, or guessed semantic equivalence.

M8 captures the original pre-canonicalization `input` and `expectedOutput` values from the successful invocation and applies `isCanonicalLocalPlainDataV1(value)` to both.

A successful run emits `replayable: true` **iff both original values return true**. Otherwise it emits the exact non-replayable variant.

### 4.1 `isCanonicalLocalPlainDataV1`

The predicate is recursive and cycle-rejecting. It uses captured untampered intrinsics and descriptor inspection.

A value is eligible only when all applicable rules below pass:

1. `null`, string, boolean, and finite number are eligible scalar values.
2. `undefined`, bigint, symbol, function, non-finite number, Promise, Proxy, accessor-bearing object, and every unsupported exotic object are ineligible.
3. An Array is eligible only when:
   - `Array.isArray(value) === true`;
   - `Object.getPrototypeOf(value) === Array.prototype` from Gotcha's local realm;
   - all own keys are exactly ordinary array index string keys plus `"length"`;
   - for every integer index `i` where `0 <= i < value.length`, index `String(i)` exists as an own data property;
   - therefore sparse arrays / holes are ineligible in V1, matching the existing M8 AI-data boundary;
   - every indexed element recursively passes this predicate;
   - no symbol or extra named property exists.
4. A plain object is eligible only when:
   - `Object.getPrototypeOf(value) === Object.prototype` from Gotcha's local realm OR `Object.getPrototypeOf(value) === null`;
   - every own key is a string;
   - every own property is a data property;
   - every own property's value recursively passes this predicate.
5. Any repeated object identity/cycle encountered during traversal is ineligible in V1. This deliberately excludes identity-sharing semantics as well as cycles.
6. Any object whose prototype is from another realm, is custom, or is not one of the exact prototypes above is ineligible.

The traversal reads values only from already-inspected own data descriptors; it never invokes getters. Proxies are rejected using the captured side-effect-free Proxy brand check before reflective traversal.

This predicate is deliberately conservative. A valid M8 run may be non-replayable for M10 V1. That is preferable to claiming exact replay for a case whose evaluator-facing semantics canonical cloning could change.

### 4.2 Replay construction

For `replayable: true`, M8 stores independently owned canonical AI-safe snapshots of `input` and `expectedOutput`. Verification reconstructs fresh canonical clones from those snapshots. Because eligibility is limited to the exact dense local-plain-data subset above, no realm/prototype/aliasing/sparse-array behavior excluded by the predicate is claimed to survive replay.

---

## 5. Independent Experiment Ownership

Replayable experiment structural data MUST be deeply independently owned from mutable legacy public result fields, including `generatedAttacks`, `attack.results`, `survivors`, and `topFinding`.

Mutating any legacy public result after return must not mutate experiment data or later replay behavior.

This is structural binding, not cryptographic historical attestation.

---

## 6. Exact Replayable Attack and Baseline Schemas

### 6.1 Bound attack

Every `experiment.attacks` element has exactly:

```js
{
  id,
  ruleId,
  rule: {
    id,
    statement,
    kind,
    severity
  },
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

Nested `rule` exact own keys: `id`, `statement`, `kind`, `severity`.

Validation requires:

- attack count 0..20 inclusive;
- unique non-empty `id`;
- non-empty `ruleId`, `type`, `description`, `rationale`;
- referenced rule is active and exactly matches embedded authority snapshot;
- `output` passes existing AI-safe data validation;
- `severity`, `realism`, `subtlety`, `novelty`, `fixability` are finite `[0,1]` numbers;
- severity equals the contract-derived value;
- output differs from expected output under M8 deep equality;
- no same-rule/deep-equal retained duplicate exists.

### 6.2 Exact M8 replay projection

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

Before drafting, this projection MUST satisfy the full current M8 generator validator. M10 must mirror future replay-relevant M8 constraints or use a shared side-effect-free validator; M10 may never knowingly validate a weaker replay schema.

### 6.3 Baseline

Every `baseline.outcomes` element is exactly:

```js
{
  attackId,
  evaluatorResult: "PASS" | "FAIL",
  survived: true | false
}
```

`baseline` exact own keys: `outcomes`, `survivorOrderIds`, `topFindingId`.

Requirements:

- exactly one unique outcome per bound attack and no extras;
- `evaluatorResult === "PASS"` iff `survived === true`;
- `survivorOrderIds` is a duplicate-free permutation of exactly survived IDs in deterministic M8 rank order;
- `topFindingId` equals first survivor ID or `null`.

---

## 7. Exact Public API Options Objects

All three public APIs validate their options container BEFORE reading semantic values.

For each options object:

- it MUST not be a Proxy;
- prototype MUST be exactly local `Object.prototype` or `null`;
- `Reflect.ownKeys()` MUST contain exactly the required string keys for that API and no symbol keys;
- each required key MUST be an own enumerable data property;
- accessors and extra/non-enumerable own properties reject;
- semantic property values are read only from validated descriptors, not ordinary property access.

Exact variants:

```js
// draftContractProtection
{
  experiment,
  sourceAttackId,
  generator
}
```

```js
// confirmContractProtection
{
  draft,
  decision
}
```

```js
// verifyContractProtection
{
  protection,
  evaluator,
  improvedEvaluator
}
```

`generator`, `evaluator`, and `improvedEvaluator` must be callable trusted local functions. Unknown options such as `signal`, `timeout`, `contract`, `case`, or replacement attacks reject in V1.

Malformed options reject before any callback executes.

---

## 8. Drafting Input and Source Selection

`draftContractProtection()` accepts only a replayable v1 experiment. It fully validates the experiment before generator execution.

`sourceAttackId` must be a non-empty string resolving to exactly one bound attack whose original baseline outcome has `survived: true`.

The generator receives an independently owned snapshot with exactly these own keys:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  instructions
}
```

`finding` is exactly the selected bound attack schema from Section 6.1.

`instructions` is exactly:

```text
The confirmed Quality Contract and selected rule are authoritative. Propose one narrow declarative evaluator-protection intent for the selected finding. Preserve unrelated correct behavior. Prefer a rule-level protection over exact-output blacklisting. Return only the required declarative schema. Do not return executable code, callbacks, ASTs, shell commands, patches, contract edits, rule-authority edits, or claims that the protection is already proven effective. Do not claim the production model produced the attack candidate.
```

Provider-specific instructions are outside M10 core.

---

## 9. Protection Generator Invocation / Async Contract

The injected protection generator is invoked exactly once after all pre-generator validation succeeds.

Invocation semantics:

1. Call `generator(generatorInput)` synchronously inside a `try` boundary.
2. If it throws synchronously, `draftContractProtection()` rejects with that same thrown value. No draft is produced.
3. Inspect the returned value with the captured side-effect-free native-Promise brand check used by the M8 trust boundary (`util.types.isPromise` or the equivalent captured implementation).
4. If and only if the return is branded as a genuine native Promise, await it exactly once.
5. If that native Promise rejects, `draftContractProtection()` rejects with the same rejection reason. No draft is produced.
6. Arbitrary thenables are NEVER assimilated and their `.then` property is never invoked by M10. A non-Promise thenable remains ordinary untrusted returned data and fails the exact generator-output / AI-safe validation.
7. After direct return or native-Promise fulfillment, validate the fulfilled value as the exact generator output below.

This permits ordinary synchronous generators and `async` functions while preventing untrusted thenable execution.

---

## 10. Exact Protection Generator Output

Only this output is accepted:

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

Exact own keys are those shown. `protection` exact own keys are `statement`, `rationale`.

Requirements:

- `version === 1`;
- task/source/rule IDs are non-empty strings exactly matching bound authority;
- statement/rationale are non-empty strings;
- entire return passes AI-safe data validation;
- accessors, Proxies, functions, unsupported exotics, alternate authority payloads, patches, callbacks, or extra fields reject.

---

## 11. Draft / Decision / Confirmed / Rejected Schemas

### 11.1 Draft

```js
{
  version: 1,
  kind: "contract-protection",
  status: "draft",
  task,
  experiment,
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
  protection: {
    statement,
    rationale
  }
}
```

All shown own keys are exact. Structural data is independently owned.

### 11.2 Decisions

Exactly:

```js
{ type: "accept" }
```

or

```js
{ type: "edit", statement: "non-empty human-authored statement" }
```

or

```js
{ type: "reject" }
```

Decision objects follow the same non-Proxy/plain-options descriptor rules as public options. Extra fields reject. Edit changes only statement; rationale remains unchanged.

### 11.3 Confirmed / rejected

Accept/edit returns the exact draft schema with `status: "confirmed"` and resulting statement. Reject returns the same exact schema with `status: "rejected"`.

Rejected artifacts cannot verify.

### 11.4 Normative cross-field binding invariants

Every draft, confirmed artifact, and rejected artifact MUST satisfy all of the following from data, not object identity:

- `task === experiment.task === experiment.contract.task`;
- `experiment` is an exact replayable v1 experiment for draft/confirmed artifacts; rejected artifacts preserve the same validated embedded experiment from their draft;
- `source.attackId` identifies exactly one attack in `experiment.attacks`;
- that attack has exactly one bound `experiment.baseline.outcomes` entry with `survived === true`;
- `source.ruleId === selectedAttack.ruleId`;
- `rule.id === source.ruleId === selectedAttack.rule.id`;
- `rule.statement === selectedAttack.rule.statement`;
- `rule.kind === selectedAttack.rule.kind`;
- `rule.severity === selectedAttack.rule.severity`;
- the rule snapshot equals the active confirmed rule with the same ID inside `experiment.contract` across `id`, `statement`, `kind`, and `severity`;
- the artifact's `protection` contains only the authorized draft/confirmed/rejected protection text; it cannot alter task/source/rule/experiment authority.

`confirmContractProtection()` fully revalidates these invariants before applying the decision. `verifyContractProtection()` fully revalidates them again before invoking either evaluator. Any edited/reloaded artifact that changes task, source, rule, experiment authority, or survivor binding rejects at the public boundary.

Serialized/reloaded artifacts are fully revalidated from data at each public boundary. Object identity is never authority.

---

## 12. Verification Architecture

Verification fully revalidates the confirmed artifact and embedded replayable experiment before invoking either evaluator.

It reconstructs fresh canonical clones of the bound case and the exact replay generator from Section 6.2, then invokes the existing `runContractAttacks()` boundary.

No provider/model call occurs during verification.

---

## 13. Stable M8 Evaluator Failure Classification Required by M10

M10 must not parse error messages or stacks to infer where evaluator execution failed.

The M8 boundary used by M10 MUST expose stable internal/additive failure classification sufficient to distinguish:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

This may be implemented with typed errors or stable non-public metadata, but existing M8 public successful-result behavior remains unchanged.

`returned-false` is valid only for positive control because attack `false` is a normal caught classification.

---

## 14. Positive-Control Truth Is Phase-Aware

Every verification semantic result contains:

```text
baselinePositiveControlPassed
improvedPositiveControlPassed
```

Each is `true | false | null`.

Normative meaning:

- `true`: that phase's positive control completed and returned boolean `true`, even if a later attack evaluation aborted;
- `false`: that phase's positive control completed and returned boolean `false`;
- `null`: that phase's positive control threw, returned non-boolean, or the phase did not run.

Completed positive-control information is never erased by a later attack-evaluation failure.

---

## 15. Strict Phase A — Baseline Gate

Baseline runs first. `improvedEvaluator` MUST NOT run until exact baseline identity passes.

### 15.1 Baseline positive-control returned false

State:

```text
baseline-positive-control-failed
```

Facts:

```text
baselinePositiveControlPassed = false
improvedPositiveControlPassed = null
baseline = null
after = null
```

### 15.2 Baseline execution failure during positive control

If positive control throws or returns non-boolean:

```text
state = baseline-execution-failed
baselinePositiveControlPassed = null
improvedPositiveControlPassed = null
baseline = null
after = null
```

### 15.3 Baseline execution failure during attack evaluation

If positive control passed but a later baseline attack evaluation throws/returns non-boolean:

```text
state = baseline-execution-failed
baselinePositiveControlPassed = true
improvedPositiveControlPassed = null
baseline = null
after = null
```

No fabricated mismatch IDs are emitted for incomplete attack evaluation.

### 15.4 Completed baseline mismatch

If M8 returns a complete baseline replay but classification/order/top finding differs from bound history:

```text
state = baseline-mismatch
baselinePositiveControlPassed = true
improvedPositiveControlPassed = null
baseline = exact replay-result snapshot from Section 17.1
after = null
```

`baselineMismatchAttackIds` includes only completed classification mismatches in bound experiment attack order. Order-only/top-finding-only mismatch yields `[]`.

### 15.5 Baseline PASS

Only exact classifications + survivor order + top finding allow Phase B.

---

## 16. Strict Phase B — Improved Replay

Phase B runs only after Phase A exact identity PASS.

### 16.1 Improved positive-control returned false

```text
state = improved-positive-control-failed
baselinePositiveControlPassed = true
improvedPositiveControlPassed = false
baseline = exact replay-result snapshot from Section 17.1
after = null
```

### 16.2 Improved execution failure during positive control

```text
state = improved-execution-failed
baselinePositiveControlPassed = true
improvedPositiveControlPassed = null
baseline = exact replay-result snapshot from Section 17.1
after = null
```

### 16.3 Improved execution failure during attack evaluation

If improved positive control passed and a later improved attack evaluation aborts:

```text
state = improved-execution-failed
baselinePositiveControlPassed = true
improvedPositiveControlPassed = true
baseline = exact replay-result snapshot from Section 17.1
after = null
```

### 16.4 Complete improved replay

```text
baselinePositiveControlPassed = true
improvedPositiveControlPassed = true
baseline = exact replay-result snapshot from Section 17.1
after = exact replay-result snapshot from Section 17.1
```

Then source closure/regression semantics apply.

---

## 17. Verification Result Payload Ownership

The result field `protection` is never the full confirmed artifact.

It is an independently owned exact snapshot:

```js
{
  statement,
  rationale
}
```

copied from the fully revalidated confirmed artifact.

### 17.1 Exact non-null `baseline` / `after` replay-result schema

Whenever `baseline` or `after` is non-null, it is an independently owned normalized snapshot with exactly these own keys:

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

Nested outcome own keys are exactly `attackId`, `evaluatorResult`, `survived`.

Normative construction and validation:

- `outcomes` contains exactly one entry for every bound `experiment.attacks` ID and no extras, in bound experiment attack order;
- `evaluatorResult === "PASS"` iff `survived === true`;
- `survivorOrderIds` is the duplicate-free deterministic M8 survivor rank order for that completed replay;
- `topFindingId` is the first `survivorOrderIds` element or `null` when no survivor exists;
- no `runContractAttacks()` result object, attack object, experiment object, callback, stack/error object, or mutable legacy result reference is exposed through `baseline` or `after`;
- both payloads are deep independent snapshots; mutating the underlying M8 replay result after normalization cannot change the returned verification result.

A completed baseline replay always normalizes to this schema before identity comparison. A completed improved replay always normalizes to the same schema before source/regression comparison.

---

## 18. Uniform Verification Result Schema

Every valid-artifact semantic verification outcome returns exactly these top-level own keys:

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

Malformed call/options/artifact input rejects and does not produce this semantic result.

`baselineExecutionError` is either `null` or exactly:

```js
{ code: "BASELINE_EVALUATOR_EXECUTION_FAILED" }
```

For partial states, pair-dependent fields use the fixed values described below.

---

## 19. Partial-State Fixed Values

### `baseline-positive-control-failed`

```text
baselineIdentityPassed = false
baselineMismatchAttackIds = []
baselineExecutionError = null
sourceFindingReproduced = false
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["baseline-positive-control-failed"]
```

### `baseline-execution-failed`

```text
baselineIdentityPassed = false
baselineMismatchAttackIds = []
baselineExecutionError = { code: "BASELINE_EVALUATOR_EXECUTION_FAILED" }
sourceFindingReproduced = false
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["baseline-execution-failed"]
```

Positive-control fields follow Section 15.2 or 15.3 depending on stable failure phase.

### `baseline-mismatch`

```text
baselineIdentityPassed = false
baselineExecutionError = null
sourceFindingReproduced = false
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["baseline-mismatch"]
```

### `improved-positive-control-failed`

```text
baselineIdentityPassed = true
baselineMismatchAttackIds = []
baselineExecutionError = null
sourceFindingReproduced = true
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["improved-positive-control-failed"]
```

### `improved-execution-failed`

```text
baselineIdentityPassed = true
baselineMismatchAttackIds = []
baselineExecutionError = null
sourceFindingReproduced = true
sourceFindingCaught = false
improvement = null
eliminatedAttackIds = []
regressionAttackIds = []
verificationPassed = false
failureReasons = ["improved-execution-failed"]
```

Positive-control fields follow Section 16.2 or 16.3 depending on stable failure phase.

---

## 20. Complete Replay Comparison

Source closure requires:

```text
bound source: survived
baseline replay source: survived
after replay source: caught
```

Regression means:

```text
baseline caught -> after survived
```

Eliminated means:

```text
baseline survived -> after caught
```

For complete baseline + after replays only:

```js
improvement =
  baseline.survivorOrderIds.length -
  after.survivorOrderIds.length;
```

Because `baseline` and `after` are the exact normalized completed-replay snapshots from Section 17.1, this formula is public-payload deterministic and does not depend on exposing internal M8 result objects.

The metric is descriptive only.

---

## 21. Deterministic ID Ordering

All public diagnostic attack-ID arrays use bound `experiment.attacks` order filtered by membership:

```text
baselineMismatchAttackIds
eliminatedAttackIds
regressionAttackIds
```

`survivorOrderIds` is the sole exception and remains deterministic M8 rank order.

No lexical, callback, Set/Map iteration, or implementation-dependent ordering is allowed.

---

## 22. Complete-Replay Failure Precedence

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

---

## 23. Verification Success Gate

`verificationPassed === true` only when:

1. options container and confirmed artifact fully validate;
2. embedded experiment is exact replayable v1;
3. all artifact cross-field binding invariants in Section 11.4 pass;
4. baseline positive control passes;
5. baseline replay completes and normalizes to the exact Section 17.1 payload;
6. baseline classifications/order/top finding exactly match bound history;
7. improved positive control passes;
8. improved replay completes and normalizes to the exact Section 17.1 payload;
9. selected source changes survived -> caught;
10. no baseline-caught attack regresses to survived.

Unrelated baseline survivors may remain.

---

## 24. What PASS Proves

A pass proves only:

> On the exact M8-bound replayable local-plain-data case and complete retained attack set, the supplied baseline evaluator reproduced bound M8 history, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove universal correctness, production behavior, future-attack coverage, semantic equivalence between protection prose and evaluator implementation, or cryptographic provenance.

---

## 25. Required Test Matrix

### Replay eligibility

- same-realm primitive/plain-object/dense-local-array trees -> replayable;
- local null-prototype plain objects -> replayable;
- sparse local arrays -> non-replayable and never produce a replayable experiment;
- cross-realm Array/Object prototype -> non-replayable;
- custom prototype -> non-replayable;
- Date/Map/Set/RegExp/typed array/Promise/Proxy/function/accessor -> non-replayable;
- repeated object identity/cycle -> non-replayable;
- eligibility never invokes evaluator or getter;
- identical successful invocation structure always selects same variant;
- every successful M8 run emits exactly one experiment variant.

### Public options

- exact three options schemas accepted;
- extra string key rejected;
- symbol key rejected;
- accessor rejected without execution;
- Proxy rejected;
- exotic prototype rejected;
- malformed options cause zero callback calls.

### Generator async contract

- direct valid object accepted;
- genuine native Promise fulfillment accepted;
- async function accepted;
- synchronous throw propagates unchanged;
- native Promise rejection propagates unchanged;
- arbitrary thenable is not awaited and `.then` is never invoked;
- fulfilled malformed generator data rejects after await.

### Experiment/artifacts

- exact schemas and own keys enforced;
- full M8 replay projection validated before generator;
- >20 attacks rejected;
- missing type/description/rationale rejected;
- unchanged/duplicate retained attacks rejected;
- legacy result mutation cannot alter experiment;
- serialized/reloaded draft/confirmed artifacts revalidate;
- task mismatch rejects at confirmation and verification;
- source attack must resolve to the selected bound original survivor;
- source rule ID mismatch rejects;
- rule snapshot mismatch against selected attack or embedded contract rejects;
- editing protection text cannot mutate experiment/source/rule authority.

### Verification

- baseline returned-false control -> exact baseline-positive-control state;
- baseline control throw/non-boolean -> baseline control fact null;
- baseline attack abort after passed control -> baseline control fact true;
- baseline mismatch never calls improved evaluator;
- improved returned-false control -> improved control fact false;
- improved control abort -> improved control fact null;
- improved attack abort after passed control -> improved control fact true;
- stable M8 failure classification is used, never message parsing;
- completed baseline payload has exact Section 17.1 keys and bound-order outcomes;
- completed after payload has exact Section 17.1 keys and bound-order outcomes;
- baseline/after never expose full M8 result or mutable aliases;
- mutating internal replay results after normalization cannot change verification output;
- all diagnostic ID arrays use bound attack order;
- simultaneous regression + source survival uses fixed precedence;
- every semantic result has exact uniform top-level keys.

### Runtime/package

- Node 14 minimum-runtime smoke;
- Node 22 full suite;
- Node 24 full suite;
- deterministic no-key example;
- packed external consumer imports all three M10 APIs.

---

## 26. Implementation Scope

Expected implementation:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. A genuine need to alter either requires architecture amendment first.

Temporary/dead validation code introduced during implementation must be removed before merge.

---

## 27. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or under-specification in:

- deterministic replay eligibility aligned with M8 AI-data constraints;
- exact replayable/non-replayable artifact schemas;
- full M8 replay-schema equivalence;
- options-object validation;
- generator sync/native-Promise/thenable semantics;
- AI/human authority transitions;
- artifact cross-field task/source/rule/survivor binding;
- serialized artifact revalidation;
- exact normalized baseline/after replay-result payloads and ownership;
- baseline-before-improved ordering;
- phase-aware positive-control facts;
- exact partial-state outputs;
- ID ordering and failure precedence;
- source closure/regression correctness;
- metric semantics.

Out of scope remains cross-realm serialization, cryptographic attestation, provider adapters, dashboards, production-model execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
