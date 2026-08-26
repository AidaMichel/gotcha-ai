# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 10
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
  -> deep-snapshot draft authority
  -> human accept / edit / reject
  -> deep-snapshot confirmed/rejected artifact
  -> caller supplies trusted evaluator callbacks
  -> validate + normalize one immutable verification authority snapshot
  -> baseline replay + exact historical identity gate
  -> only then improved replay from the SAME immutable snapshot
  -> source closure + regression verification
```

AI output remains declarative. Human confirmation is mandatory. The caller owns executable evaluator code. Gotcha owns validation, replay eligibility, authority binding, ownership, phase ordering, and deterministic verification results.

## 2. Four Normative Boundary Primitives

Revision 10 defines four shared primitives. Public APIs and nested artifacts MUST use these rules instead of inventing local variants.

### 2.1 `isExactDataContainerV1(value, exactKeys)`

For every schema container named by this spec:

- value MUST NOT be a Proxy;
- prototype MUST be exactly Gotcha-local `Object.prototype`;
- `Reflect.ownKeys(value)` MUST equal the exact required string-key set and contain no symbols;
- every required key MUST be an own enumerable data property;
- accessors, non-enumerable properties, extras, symbols, null/custom/cross-realm prototypes, and exotic objects reject;
- semantic values are read only from already-inspected descriptors, never ordinary property access before validation.

Arrays use the dedicated dense-array rule in Section 3; array elements that are schema records use this container primitive.

This primitive applies to: experiments, `case`, replay metadata, reason, attacks, embedded rules, baseline, baseline outcomes, all public options objects, generator input/output, draft/confirmed/rejected artifacts, source, protection, decision objects, normalized replay results, replay outcomes, and semantic verification results.

### 2.2 `isAcceptedCallbackV1(value)`

For `generator`, `evaluator`, and `improvedEvaluator`, V1 acceptance is exactly:

- `typeof value === "function"`;
- value MUST NOT be a Proxy, using a captured side-effect-free Proxy brand check;
- no realm restriction;
- ordinary, bound, native, arrow, async, generator-function, cross-realm, and callable-function-object variants are accepted if they satisfy the two rules above;
- M10 does not inspect `name`, `prototype`, constructor identity, source text, async/generator tags, or function realm;
- callback behavior is constrained only by the invocation/result contracts below.

This intentionally aligns acceptance with M8's broad callable boundary while explicitly excluding proxied callables.

### 2.3 `isWireReplayableV1(value)`

Replayable values are intentionally narrower than general M8 AI-data values.

First perform an iterative, getter-free, descriptor-based structural walk using captured intrinsics. Eligible values are only:

- `null`, string, boolean, finite number;
- dense Gotcha-local Arrays with exact local `Array.prototype`, every index `0..length-1` present as enumerable own data property, no extra/symbol keys;
- ordinary Gotcha-local Objects with exact local `Object.prototype`, enumerable own string data properties only;
- recursively eligible descendants;
- no repeated object identity anywhere in the walked value graph and no cycles.

Everything else is ineligible, including `undefined`, bigint, symbol, function, non-finite number, sparse arrays, null-prototype objects, cross-realm/custom prototypes, accessors, Proxy, Date/Map/Set/RegExp, typed arrays, ArrayBuffer/DataView, Promise, and other exotics.

Then perform the REQUIRED wire probe before returning true:

1. call captured untampered `JSON.stringify(value)`;
2. if it throws for any reason, return false;
3. require the result to be a string;
4. call captured untampered `JSON.parse(serialized)`;
5. if it throws, return false;
6. structurally validate the parsed value against the same allowed scalar/array/object class, excluding the second stringify/parse recursion;
7. require M8 deep equality between the canonical in-memory snapshot and parsed value.

Only then does `isWireReplayableV1(value)` return true.

Therefore engine-dependent deep nesting that causes `JSON.stringify` to throw is deterministically classified non-replayable on that runtime rather than producing an invalid replayable artifact.

### 2.4 `deepOwnedSnapshotV1(value)`

Whenever this spec says a value is snapshotted, the returned graph MUST:

- contain no mutable object/array reference reachable from the input graph;
- preserve the exact admitted data/schema values;
- be built from validated descriptor values only;
- use fresh local ordinary Objects and fresh dense local Arrays;
- never invoke getters, Proxy traps, arbitrary thenables, callbacks, or user serialization hooks.

For wire-replayable case/attack data, snapshotting may use the already validated canonical/JSON-stable representation. For exact schema records, recursively construct fresh containers from validated fields.

## 3. Required M8 Experiment Emission

Every successful `runContractAttacks()` call MUST return exactly one own `experiment` field.

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

All object containers use `isExactDataContainerV1` with exactly the keys shown.

A successful run emits this variant iff `isWireReplayableV1` passes for:

- original pre-canonicalization input;
- original pre-canonicalization expected output;
- every retained attack output.

Case values, attack outputs, contract snapshot, attacks, baseline data, and nested records are emitted as deep independently owned snapshots from mutable legacy M8 result fields.

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

Exact top-level keys: `version`, `kind`, `replayable`, `task`, `reason`. `reason` has exactly `code`.

No contract, case, attacks, baseline, replay metadata, or free-form reason text is present. Drafting rejects this variant before generator invocation.

## 4. Replayable Attack Schema

Every `experiment.attacks` element is exactly:

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

Validation requires:

- attack count `0..20` inclusive;
- unique non-empty `id`;
- non-empty `ruleId`, `type`, `description`, `rationale`;
- embedded rule is exact active confirmed contract authority;
- `output` passes current M8 AI-safe validation AND `isWireReplayableV1`;
- score fields are finite `[0,1]` numbers;
- severity equals contract-derived severity;
- output differs from expected output under M8 deep equality;
- no same-rule/deep-equal retained duplicate exists.

Replay projection into M8 is exactly:

```js
{
  version: 1,
  task: experiment.task,
  attacks: experiment.attacks.map(attack => ({
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
  }))
}
```

Pre-draft validation MUST satisfy the full current replay-relevant M8 generator validator. M10 may not knowingly validate a weaker replay schema.

## 5. Bound Baseline Schema

`experiment.baseline` is exactly:

```js
{
  outcomes: [
    {
      attackId,
      evaluatorResult: "PASS" | "FAIL",
      survived: true | false
    }
  ],
  survivorOrderIds,
  topFindingId
}
```

Requirements:

- one unique outcome per bound attack and no extras, in bound attack order;
- `evaluatorResult === "PASS"` iff `survived === true`;
- `survivorOrderIds` is a duplicate-free permutation of exactly survived IDs in deterministic M8 rank order;
- `topFindingId` is first survivor ID or `null`.

## 6. Public Options Objects

All three API option containers use `isExactDataContainerV1` before semantic reads:

```js
// draftContractProtection
{ experiment, sourceAttackId, generator }

// confirmContractProtection
{ draft, decision }

// verifyContractProtection
{ protection, evaluator, improvedEvaluator }
```

Callbacks MUST satisfy `isAcceptedCallbackV1`. Malformed options reject before callback execution.

## 7. Drafting and Generator Contract

`draftContractProtection()` accepts only an exact replayable experiment. It fully revalidates the experiment, including wire replayability, replay projection, baseline completeness, and cross-field contract/rule authority before invoking the generator.

`sourceAttackId` must resolve to exactly one bound original survivor.

Before invoking the generator, M10 constructs an independently owned generator input:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  instructions
}
```

`finding` is the exact selected bound attack snapshot. `instructions` is the locked V1 instruction string.

Generator invocation:

1. call once synchronously inside `try`;
2. synchronous throw propagates unchanged;
3. if captured side-effect-free native-Promise branding says the returned value is a genuine native Promise, await exactly once;
4. native-Promise rejection propagates unchanged;
5. arbitrary thenables are never assimilated and `.then` is never invoked;
6. direct/fulfilled values are validated as exact generator output.

Exact generator output:

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

Task/source/rule IDs must match bound authority. Statement/rationale are non-empty strings. All containers use `isExactDataContainerV1`.

### 7.1 Draft ownership — REQUIRED at draft construction

After generator output validates, `draftContractProtection()` MUST construct the returned draft using `deepOwnedSnapshotV1` from both:

- the validated input experiment; and
- the validated generator output.

The returned draft MUST retain no mutable object/array reference from either source.

Therefore later mutation of the caller-supplied experiment or of an object retained by the generator cannot alter the human-visible draft or later confirmation authority.

## 8. Draft / Decision / Confirmed / Rejected Artifacts

Exact artifact:

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

Every nested record uses `isExactDataContainerV1`.

Exact decisions:

```js
{ type: "accept" }
{ type: "edit", statement: "non-empty human-authored statement" }
{ type: "reject" }
```

Decision containers use `isExactDataContainerV1`. Edit changes only protection statement.

`confirmContractProtection()` MUST fully revalidate the draft and decision, then create a deep independently owned returned confirmed/rejected artifact. No mutable object/array reference may be shared with draft or decision.

Cross-field invariants for draft/confirmed/rejected:

- `task === experiment.task === experiment.contract.task`;
- experiment is exact replayable V1;
- source attack resolves exactly once and its bound baseline outcome survived;
- `source.ruleId === selectedAttack.ruleId`;
- `rule.id === source.ruleId === selectedAttack.rule.id`;
- rule statement/kind/severity equal selected attack rule snapshot;
- rule snapshot equals active confirmed embedded contract rule;
- protection text cannot alter authority.

Rejected artifacts cannot verify.

## 9. Verification Authority Snapshot — REQUIRED BEFORE CALLBACKS

`verifyContractProtection()` performs this exact order:

1. validate options container;
2. validate both callbacks with `isAcceptedCallbackV1`;
3. fully validate confirmed artifact, every nested container, embedded experiment, wire replayability, baseline, replay projection, and cross-field authority;
4. BEFORE invoking baseline evaluator, construct one `verificationAuthority` using `deepOwnedSnapshotV1` containing every datum used by either phase or by the result:
   - task;
   - source attack/rule identity;
   - protection statement/rationale;
   - confirmed rule snapshot;
   - canonical case input/expected output;
   - complete replay attack set and outputs;
   - bound baseline outcomes/order/top finding;
   - exact replay generator data;
5. after this snapshot exists, verifier MUST NOT read replay/authority/protection data again from the caller-supplied artifact;
6. baseline and improved phases both reconstruct their inputs only from the SAME `verificationAuthority` snapshot.

Therefore mutation of the caller artifact by the caller, baseline evaluator, or any other code after verification begins cannot change Phase B authority or result protection data.

## 10. Stable M8 Evaluator Failure Classification

M10 never parses messages or stacks. M8 must expose stable internal/additive classification:

```text
phase = positive-control | attack-evaluation
reason = returned-false | threw | non-boolean
```

`returned-false` is valid only for positive control; attack false is a normal caught classification.

## 11. Strict Baseline Gate and Positive-Control Truth

Fields:

```text
baselinePositiveControlPassed: true | false | null
improvedPositiveControlPassed: true | false | null
```

Meaning:

- `true`: control returned boolean true, even if later attack evaluation aborts;
- `false`: control returned boolean false;
- `null`: control threw, returned non-boolean, or phase did not run.

Baseline runs first. Improved evaluator MUST NOT run until a complete baseline replay exactly reproduces bound history.

Baseline terminal states:

- `baseline-positive-control-failed`;
- `baseline-execution-failed`;
- `baseline-mismatch`.

Improved partial states after baseline PASS:

- `improved-positive-control-failed`;
- `improved-execution-failed`.

## 12. Exact Normalized Replay Result

Whenever `baseline` or `after` is non-null, it is a deep independently owned exact record:

```js
{
  outcomes: [
    {
      attackId,
      evaluatorResult: "PASS" | "FAIL",
      survived: true | false
    }
  ],
  survivorOrderIds,
  topFindingId
}
```

Outcome order is bound attack order. Survivor order is M8 deterministic rank order. Top finding is first survivor or null.

No full M8 result, callbacks, errors/stacks, embedded experiment, or mutable replay aliases are exposed.

## 13. Exact Baseline Identity and Mismatch IDs

A completed baseline identity PASS requires all three:

1. every attack classification equals the bound baseline outcome;
2. `survivorOrderIds` exactly equals bound survivor order;
3. `topFindingId` exactly equals bound top finding.

`baselineMismatchAttackIds` membership is EXACTLY the bound attack IDs whose completed replay `survived` value differs from the corresponding bound baseline `survived` value, filtered in bound attack order.

Order-only and/or top-finding-only mismatch with identical per-attack classifications yields:

```text
baselineMismatchAttackIds = []
```

This array never attempts to encode ranking/top-finding-only mismatch indirectly.

Incomplete evaluator execution is `baseline-execution-failed`, not `baseline-mismatch`, and also yields `[]`.

## 14. Uniform Verification Result

Every semantic verification result has exactly:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection: { statement, rationale },
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

The result `protection` is a deep independent `{ statement, rationale }` snapshot from `verificationAuthority`, never the full artifact.

`baselineExecutionError` is null or exactly:

```js
{ code: "BASELINE_EVALUATOR_EXECUTION_FAILED" }
```

Partial states use deterministic null/false/empty-array values; no omitted fields.

## 15. Complete Improved Replay Semantics

For complete baseline + improved replay:

- `sourceFindingReproduced = true`;
- `sourceFindingCaught =` whether after outcome for `sourceAttackId` has `survived === false`, independent of overall verification status;
- regression = baseline caught -> after survived;
- eliminated = baseline survived -> after caught;
- `eliminatedAttackIds` and `regressionAttackIds` use bound attack order;
- `improvement = baseline.survivorOrderIds.length - after.survivorOrderIds.length`.

Failure precedence:

```text
1. regression-detected
2. source-finding-still-survives
```

`failureReasons` contains every applicable reason in that order. `state` is first reason. If none apply: `state = verified`, `verificationPassed = true`.

A source may be caught while verification fails because another attack regressed; in that case `sourceFindingCaught === true`.

## 16. Partial-State Fixed Facts

### `baseline-positive-control-failed`

```text
baselineIdentityPassed=false
baselineMismatchAttackIds=[]
baselineExecutionError=null
baselinePositiveControlPassed=false
improvedPositiveControlPassed=null
baseline=null
after=null
sourceFindingReproduced=false
sourceFindingCaught=false
improvement=null
eliminatedAttackIds=[]
regressionAttackIds=[]
verificationPassed=false
failureReasons=["baseline-positive-control-failed"]
```

### `baseline-execution-failed`

Same pair-dependent false/null/empty values; `baselineExecutionError={code:"BASELINE_EVALUATOR_EXECUTION_FAILED"}`. Baseline control fact is null for control throw/non-boolean and true for later attack abort.

### `baseline-mismatch`

`baseline` is the completed normalized replay, `after=null`, `baselineIdentityPassed=false`, `baselineExecutionError=null`, improved control null, pair-dependent facts false/null/empty, and `failureReasons=["baseline-mismatch"]`.

### `improved-positive-control-failed`

Baseline identity true with normalized baseline present; improved control false; after null; pair-dependent facts use false/null/empty; `failureReasons=["improved-positive-control-failed"]`.

### `improved-execution-failed`

Baseline identity true with normalized baseline present; after null; improved control null if control aborted or true if later attack evaluation aborted; pair-dependent facts use false/null/empty; `failureReasons=["improved-execution-failed"]`.

## 17. Required Test Matrix

Implementation MUST include tests proving:

### Boundary primitives

- every named schema container rejects Proxy, accessor, symbol key, non-enumerable key, extra key, null/custom/cross-realm prototype before semantic reads;
- callback acceptance exactly matches `typeof === "function"` plus non-Proxy, including async, bound, native, arrow, generator-function, and cross-realm functions;
- proxied callable rejects before invocation.

### Wire replayability

- dense ordinary local JSON-stable trees pass;
- null-prototype, sparse, cross-realm/custom, accessor, Proxy, exotic, shared identity, cycle, and non-finite values fail;
- attack outputs use the same predicate as case values;
- a deeply nested otherwise-plain value for which captured `JSON.stringify` throws is non-replayable;
- every replayable admitted value completes stringify/parse and stays M8-deep-equal.

### Ownership

- legacy M8 result mutation cannot alter experiment;
- caller experiment mutation after draft return cannot alter draft;
- generator-retained return object mutation cannot alter draft;
- draft/decision mutation after confirmation cannot alter confirmed/rejected artifact;
- returned artifact mutation cannot alter draft;
- caller artifact mutation after verification starts, including mutation from inside baseline evaluator, cannot alter Phase B inputs or result protection.

### Identity/results

- baseline classification mismatch IDs contain exactly classification-different attacks in bound order;
- ranking-only/top-finding-only mismatch yields empty mismatch ID array;
- incomplete baseline execution yields execution-failed, not mismatch;
- baseline failure never invokes improved evaluator;
- completed source caught plus unrelated regression reports `sourceFindingCaught=true` and verification false;
- normalized baseline/after/results contain exact keys and no mutable/full M8 aliases.

### Runtime/package

- Node 14 minimum-runtime smoke;
- Node 22 full suite;
- Node 24 full suite;
- deterministic no-key example;
- packed external consumer imports all three M10 APIs.

## 18. Implementation Scope

Expected implementation:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to alter either requires architecture amendment first.

Temporary/dead code introduced during implementation must be removed before merge.

## 19. Acceptance / Stopping Rule

M10 is implementation-ready only after a fresh exact-head review finds no concrete contradiction or V1 implementation-choice ambiguity in:

- the four shared boundary primitives;
- actual stringify/parse-based replay eligibility for case and attack outputs;
- exact callback acceptance;
- exact nested container validation;
- M8 experiment ownership;
- draft ownership;
- confirmation ownership;
- one verification authority snapshot before baseline callbacks;
- baseline-before-improved ordering;
- exact baseline mismatch ID membership;
- exact normalized result schemas and partial states;
- source/regression/improvement semantics.

Out of scope remains lossless arbitrary graph/prototype serialization, cross-realm serialization, cryptographic provenance, provider adapters, dashboards, production-model execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
