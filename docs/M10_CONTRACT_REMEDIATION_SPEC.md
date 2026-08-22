# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 5
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal

M10 closes the confirmed-contract loop after `GOTCHA` without turning model output into executable evaluator policy.

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
  ↓
ATTACK
  ↓
RANK
  ↓
GOTCHA
  ↓
M8 EMITS ONE REPLAYABLE EXPERIMENT
  ↓
AI DRAFTS DECLARATIVE PROTECTION INTENT
  ↓
HUMAN ACCEPT / EDIT / REJECT
  ↓
CALLER IMPLEMENTS TRUSTED IMPROVED EVALUATOR
  ↓
BASELINE REPLAY ONLY
  ↓
EXACT BASELINE IDENTITY GATE
  ↓
ONLY THEN IMPROVED REPLAY
  ↓
POSITIVE CONTROL + SOURCE CLOSURE + REGRESSION CHECK
```

The AI proposes what should be protected. A human authorizes the intent. The caller owns executable evaluator implementation. Gotcha owns experiment binding, replay, validation, and deterministic verification output.

---

## 2. Authority Boundary

AI/model output remains declarative data only. M10 does not execute AI-generated JavaScript, callbacks, ASTs, shell commands, patches, or evaluator code.

A human must explicitly accept, edit, or reject remediation intent before verification.

The caller supplies trusted local synchronous callbacks:

```js
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

The current/pre-remediation evaluator is not historical authority. It is only a compatibility witness and must reproduce the M8-bound baseline exactly before the improved evaluator can run.

---

## 3. Required Additive M8 Experiment Artifact

A successful `runContractAttacks()` may add:

```js
contractAttackResult.experiment
```

A replayable experiment is produced inside the same successful M8 invocation from the exact validated contract/case, complete retained attack set, original outcomes, survivor order, and top finding.

Conceptual versioned shape:

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
      kind: "m8-evaluator-case"
      // Gotcha-owned replay metadata only
    }
  },
  attacks: [/* complete retained post-filter/post-dedupe attacks */],
  baseline: {
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
}
```

`case.input` and `case.expectedOutput` are canonical AI-safe snapshots. `case.replay` is Gotcha-owned execution metadata sufficient to preserve/reconstruct evaluator-observable semantics supported by M8, including supported cross-realm prototype/realm provenance where canonicalization would lose it.

If those semantics cannot be safely reconstructed, the run is non-replayable for M10. M10 drafting must reject a non-replayable result before any protection-generator call. It may never silently substitute canonical-only replay and call that exact replay.

### Independent ownership

Experiment structural data and replay metadata must not alias mutable legacy result fields such as `generatedAttacks`, `attack.results`, `survivors`, or `topFinding`.

Mutating any legacy public result field after M8 returns must not mutate the experiment or change later replay behavior.

This is structural binding, not cryptographic attestation against a caller deliberately fabricating a new self-consistent history.

---

## 4. Experiment Validation Is Replay-Complete

Before `draftContractProtection()` invokes the protection generator, the experiment must satisfy every invariant needed for the deterministic replay projection to pass M8 validation unchanged.

### 4.1 Identity and contract

- `version === 1`
- `kind === "contract-attack-experiment"`
- `replayable === true`
- `experiment.task` is a non-empty string
- `experiment.task === experiment.contract.task`
- contract is a valid confirmed Quality Contract under the existing contract validator

### 4.2 Case

- canonical `input` and `expectedOutput` pass the existing AI-safe data boundary
- replay metadata is a valid Gotcha-owned `m8-evaluator-case` v1 representation for that exact case
- replay metadata cannot become alternate caller-authored case data or model authority

### 4.3 Complete M8 replay-generator schema

The replay projection is conceptually:

```js
{
  version: 1,
  task: experiment.task,
  attacks: experiment.attacks.map(projectForM8Replay)
}
```

A valid experiment must make that projected generator output satisfy the **full current M8 generator schema before drafting**, not merely a subset of it.

Normative requirements include:

- `attacks` is an array
- attack count is within M8's `MAX_ATTACKS` limit; for the M8 version bound by this spec, maximum is **20**
- every attack ID is a unique non-empty string
- every `ruleId` is a non-empty string resolving to an active confirmed rule
- every replay candidate has non-empty string `type`
- every replay candidate has non-empty string `description`
- every replay candidate has non-empty string `rationale`
- every replay candidate has an own mutated-output value through the artifact's bound `output` → replay `mutatedOutput` mapping
- mutated output passes the existing AI-safe data boundary
- replay scores object has exactly the required M8 score dimensions used by the current generator contract: `realism`, `subtlety`, `novelty`, `fixability`
- each required score is finite and within `[0, 1]`
- embedded rule identity/statement/kind/severity matches confirmed contract authority exactly
- stored severity equals the value derived from confirmed contract severity
- every retained attack differs from bound expected output under M8 deep-equality semantics
- no same-rule/deep-equal retained duplicate exists under M8 retained-set dedupe semantics
- values rejected by the M8 AI-data boundary, including functions, accessors, Proxies, unsupported exotic values, or other disallowed executable/behavioral data, are rejected before generator execution

**Future-proof rule:** if the M8 generator validator gains another required replay constraint before M10 implementation lands, M10 experiment validation must mirror that constraint or delegate to a side-effect-free shared validator. M10 may not maintain a knowingly weaker replay schema.

### 4.4 Baseline binding

- baseline outcome IDs are unique
- there is exactly one outcome for every bound attack ID and no extras
- `evaluatorResult === "PASS"` iff `survived === true`
- `survivorOrderIds` is a duplicate-free permutation of exactly the survived IDs in deterministic original rank order
- `topFindingId` is the first survivor ID, or `null` when there are no survivors

Any validation failure rejects atomically before the protection generator runs.

---

## 5. Locked Public APIs

```js
const {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("gotcha-ai");
```

```js
await draftContractProtection({
  experiment,
  sourceAttackId,
  generator
});
```

```js
confirmContractProtection({
  draft,
  decision
});
```

```js
await verifyContractProtection({
  protection,
  evaluator,
  improvedEvaluator
});
```

No public M10 API accepts a replacement verification-time contract, case, expected output, attack set, baseline history, source finding payload, or task identity.

---

## 6. Protection Generator Contract

The injected generator receives only validated canonical data:

```js
{
  contract: experiment.contract,
  input: experiment.case.input,
  expectedOutput: experiment.case.expectedOutput,
  finding,
  instructions
}
```

Replay metadata is Gotcha execution authority and is not sent to the model.

### 6.1 Exact generator output schema

Only this versioned declarative shape is accepted:

```js
{
  version: 1,
  task: "...",
  sourceAttackId: "...",
  ruleId: "...",
  protection: {
    statement: "...",
    rationale: "..."
  }
}
```

Validation rules:

- top-level own keys are exactly `version`, `task`, `sourceAttackId`, `ruleId`, `protection`
- `version === 1`
- `task`, `sourceAttackId`, and `ruleId` are non-empty strings
- all three identities exactly match the validated experiment/source/rule authority
- `protection` is a plain own-data object with exactly `statement` and `rationale`
- `statement` and `rationale` are non-empty strings
- the entire output passes the existing AI-safe data boundary
- functions, accessors, Proxies, executable/code-bearing objects, or unsupported exotic values are rejected
- no model-provided contract, rule snapshot, experiment, evaluator code, callback, patch, or alternate case is accepted

Unknown/extra fields are rejected rather than silently ignored so serialized artifacts have one deterministic schema.

---

## 7. Draft Artifact Schema

After generator validation, M10 emits a deeply independently owned draft:

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

Rules:

- top-level and nested keys are exact for v1
- `task === experiment.task === experiment.contract.task`
- source attack resolves to a bound original survivor
- source rule matches the source attack and confirmed contract rule
- `rule` is a snapshot of contract authority, not generator authority
- experiment/source/rule/task are immutable through confirmation
- draft structural data is deep-snapshotted under the AI-safe data policy

Serialized/reloaded drafts must be fully revalidated before confirmation. Object identity is never trusted as proof of validity.

---

## 8. Confirmation Decision and Result Schemas

Only these decision shapes are valid:

```js
{ type: "accept" }
```

```js
{
  type: "edit",
  statement: "human-authored non-empty statement"
}
```

```js
{ type: "reject" }
```

Decision objects use exact own keys for their selected variant; unknown fields are rejected. `edit` may change only the protection statement. Rationale remains the validated draft rationale in V1.

### 8.1 Confirmed result

Accept/edit returns:

```js
{
  version: 1,
  kind: "contract-protection",
  status: "confirmed",
  task,
  experiment,
  source,
  rule,
  protection: {
    statement,
    rationale
  }
}
```

The confirmed artifact is deeply independently snapshotted and must pass the same full artifact validation when serialized/reloaded before verification.

### 8.2 Rejected result

Reject returns:

```js
{
  version: 1,
  kind: "contract-protection",
  status: "rejected",
  task,
  experiment,
  source,
  rule,
  protection
}
```

A rejected artifact cannot verify. `verifyContractProtection()` rejects it at the public boundary; it does not return a remediation semantic state.

---

## 9. Verification Artifact Revalidation

Before invoking either evaluator, verification revalidates the confirmed protection and embedded experiment from data, including:

- exact v1 artifact schemas
- confirmed status
- task/source/rule authority
- full experiment replay schema
- baseline bijection/order/top-finding invariants
- replayability and replay metadata validity

Malformed, stale-schema, extra-field, non-AI-safe, or internally inconsistent artifacts reject before evaluator execution.

---

## 10. Strict Two-Phase Replay

Verification reconstructs a Gotcha-owned deterministic replay generator from the bound attacks and reconstructs the exact evaluator-facing case from `experiment.case.replay`.

Severity is re-derived by M8 from contract authority.

Verification performs no model/provider call and reuses `runContractAttacks()` rather than creating a second evaluator-safety implementation.

### Phase A — baseline only

```js
const baselineReplay = await runContractAttacks({
  contract: experiment.contract,
  input: replayCase.input,
  expectedOutput: replayCase.expectedOutput,
  evaluator,
  generator: replayGenerator
});
```

M10 then compares every bound attack classification, survivor order, and top finding with bound history.

`improvedEvaluator` is not called unless this phase completes and exact identity passes.

### Phase B — improved only after Phase A PASS

```js
const afterReplay = await runContractAttacks({
  contract: experiment.contract,
  input: replayCase.input,
  expectedOutput: replayCase.expectedOutput,
  evaluator: improvedEvaluator,
  generator: replayGenerator
});
```

The same reconstructed case and bound attack set are used.

---

## 11. Canonical Ordering Rule for Reported Attack IDs

All public verification arrays that report attack IDs use **bound experiment attack order**, i.e. the order of `experiment.attacks`, filtered by membership in the relevant set.

This applies normatively to:

```text
baselineMismatchAttackIds
eliminatedAttackIds
regressionAttackIds
```

It also applies to any future V1 diagnostic attack-ID array unless that field explicitly states another order.

`survivorOrderIds` is the sole exception because its meaning is deterministic M8 survivor rank order, not bound attack order.

No lexical sorting, callback-result order, Set/Map iteration order, or implementation-dependent order may replace these rules.

---

## 12. Baseline Outcomes and Exact Partial Results

### 12.1 Completed baseline identity mismatch

If baseline replay completes but classifications/order/top finding differ from history:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,
  baseline: { attack, topFinding },
  after: null,
  baselineIdentityPassed: false,
  baselineMismatchAttackIds, // bound attack order
  baselineExecutionError: null,
  sourceFindingReproduced: false,
  sourceFindingCaught: false,
  positiveControlPassed: true,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["baseline-mismatch"],
  state: "baseline-mismatch"
}
```

If only survivor ordering/top-finding differs while classifications match, `baselineMismatchAttackIds` is `[]`; order/top mismatch remains represented by the terminal state and baseline payload. M10 does not fabricate attack IDs for a non-classification mismatch.

### 12.2 Baseline execution failure

If the baseline evaluator throws, returns non-boolean, or M8 otherwise cannot complete callback execution, return exactly:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,
  baseline: null,
  after: null,
  baselineIdentityPassed: false,
  baselineMismatchAttackIds: [],
  baselineExecutionError: {
    code: "BASELINE_EVALUATOR_EXECUTION_FAILED"
  },
  sourceFindingReproduced: false,
  sourceFindingCaught: false,
  positiveControlPassed: null,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["baseline-execution-failed"],
  state: "baseline-execution-failed"
}
```

`positiveControlPassed` is `null` because M10 does not expose execution-progress timing as semantic output; the replay did not complete and historical identity was not established.

No mismatch IDs are fabricated for unevaluated attacks. Stable error classification is used; callback stack/message text is not semantic authority. `improvedEvaluator` is never called.

---

## 13. Improved-Replay Partial Results

### 13.1 Improved positive-control failure

When M8 identifies the improved evaluator rejecting the known-good output before attack results exist:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,
  baseline: { attack, topFinding },
  after: null,
  baselineIdentityPassed: true,
  baselineMismatchAttackIds: [],
  baselineExecutionError: null,
  sourceFindingReproduced: true,
  sourceFindingCaught: false,
  positiveControlPassed: false,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["improved-positive-control-failed"],
  state: "improved-positive-control-failed"
}
```

### 13.2 Other improved evaluator execution failure

To avoid an implementation-defined reject-vs-return split, any non-positive-control improved callback execution abort is a deterministic semantic state:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,
  baseline: { attack, topFinding },
  after: null,
  baselineIdentityPassed: true,
  baselineMismatchAttackIds: [],
  baselineExecutionError: null,
  sourceFindingReproduced: true,
  sourceFindingCaught: false,
  positiveControlPassed: null,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["improved-execution-failed"],
  state: "improved-execution-failed"
}
```

The implementation may expose a stable non-stack diagnostic code in a future additive field, but V1 consumers do not depend on callback message text.

---

## 14. Complete Improved Replay Semantics

Source closure requires:

```text
bound original: source SURVIVED
baseline replay: source SURVIVED
after replay: source CAUGHT
```

A regression is:

```text
baseline CAUGHT -> after SURVIVED
```

`eliminatedAttackIds` is:

```text
baseline SURVIVED -> after CAUGHT
```

Both arrays use bound experiment attack order.

For complete baseline + after replays only:

```js
improvement =
  baselineReplay.attack.survivors.length -
  afterReplay.attack.survivors.length;
```

The metric is descriptive and cannot override identity-level correctness gates.

---

## 15. Deterministic Failure Precedence

Terminal Phase A states prevent Phase B execution:

```text
baseline-execution-failed
baseline-mismatch
```

After Phase A passes, pre-attack Phase B states are:

```text
improved-positive-control-failed
improved-execution-failed
```

For a **complete** improved replay, compute all applicable correctness failures in exactly this order:

```text
1. regression-detected
2. source-finding-still-survives
```

`failureReasons` contains every applicable complete-replay failure in that order. `state` is the first reason. If none apply:

```js
failureReasons = [];
state = "verified";
verificationPassed = true;
```

---

## 16. Complete Verification Output

A complete baseline + improved replay returns exactly the v1 fields below:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,
  baseline: { attack, topFinding },
  after: { attack, topFinding },
  baselineIdentityPassed: true,
  baselineMismatchAttackIds: [],
  baselineExecutionError: null,
  sourceFindingReproduced: true,
  sourceFindingCaught,
  positiveControlPassed: true,
  improvement,
  eliminatedAttackIds,
  regressionAttackIds,
  verificationPassed,
  failureReasons,
  state
}
```

All semantic states use the same top-level field set. Partial states assign `null`, `false`, or `[]` exactly as specified above; fields are not conditionally omitted.

Malformed input/artifact validation failures remain public-boundary rejections, not verification semantic states.

---

## 17. Verification Success Gate

`verificationPassed === true` only when all are true:

1. confirmed protection and embedded experiment pass full v1 revalidation
2. experiment is replayable and preserves evaluator-facing semantics
3. baseline replay completes
4. baseline classifications/order/top finding exactly reproduce bound history
5. improved replay completes
6. improved known-good output passes
7. selected source is a bound original survivor and is reproduced as a baseline survivor
8. selected source is caught after remediation
9. no baseline-caught attack becomes an after survivor

Unrelated baseline survivors may remain.

---

## 18. What PASS Proves

A pass proves only:

> On the exact replayable M8-bound original case and complete retained attack set, the supplied baseline evaluator reproduced the original M8 history, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove universal correctness, future-attack coverage, production-model behavior, formal equivalence between protection text and evaluator implementation, absence of unseen regressions, or cryptographic historical authenticity.

---

## 19. Trust and Serialization Model

Untrusted structured data includes:

- serialized/reloaded experiments
- serialized/reloaded draft/confirmed/rejected protection artifacts
- protection-generator output
- confirmation decisions crossing the public boundary

All are validated from data on each public boundary. Previously validated object identity is never authority.

Trusted local executable callbacks are the baseline evaluator, improved evaluator, and injected generator callback itself. Model-produced generator return data remains untrusted.

Gotcha is not a generic JavaScript sandbox.

---

## 20. Preferred Implementation Shape

Expected M10 core:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
```

Additive M8 experiment/replay support:

```text
src/contract-attacks.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to change either requires an explicit architecture amendment before implementation proceeds.

---

## 21. Required Test Matrix

### M8 experiment emission / replay

- successful run emits independently owned replayable experiment
- legacy result mutation cannot change experiment structure or replay behavior
- task equals contract task
- supported cross-realm evaluator semantics replay exactly
- unreconstructable semantics are explicitly non-replayable
- attack count 0..20 accepted as otherwise valid; >20 rejected before generator
- missing/empty replay `type`, `description`, or `rationale` rejected before generator
- missing replay-required score or invalid score rejected before generator
- unchanged-output attack rejected before generator
- same-rule/deep-equal retained duplicate rejected before generator
- omitted/extra/duplicate attack or baseline outcome rejected

### Generator / artifact schemas

- exact generator output shape accepted
- missing required key rejected
- extra unknown key rejected
- task/source/rule mismatch rejected
- empty statement/rationale rejected
- function/accessor/Proxy/unsupported data rejected
- draft exact schema validated after generation
- serialized/reloaded draft revalidated
- accept exact decision accepted
- edit statement-only exact decision accepted
- reject exact decision accepted
- decision extra fields rejected
- confirmed artifact exact schema revalidated before verification
- rejected artifact cannot verify

### Verification ordering and partial states

- baseline mismatch never calls improved evaluator
- baseline callback abort returns exact `baseline-execution-failed` field values
- no baseline mismatch IDs invented for unevaluated attacks
- completed classification mismatch IDs use bound experiment attack order
- improved known-good rejection returns exact partial shape
- other improved evaluator abort returns exact `improved-execution-failed` partial shape
- regression IDs use bound experiment attack order
- eliminated IDs use bound experiment attack order
- survivor order remains M8 rank order and is not replaced by bound attack order
- simultaneous regression + source survival yields ordered reasons and primary `regression-detected`
- every semantic state emits the same top-level field set
- `improvement` is null for partial states and uses locked formula for complete states

### Runtime/package

- Node 14 minimum-runtime smoke
- Node 22 full suite
- Node 24 full suite
- deterministic no-key example
- packed external consumer imports/uses all three public M10 APIs

---

## 22. Acceptance Gates

M10 architecture is implementation-ready only when a fresh exact-head review finds no concrete contradiction in these locked contracts:

1. experiment ownership/completeness and replayability
2. exact M8 replay-generator schema equivalence
3. evaluator-facing replay fidelity
4. task/case/attack/outcome authority
5. exact generator/draft/decision/confirmed/rejected schemas
6. human authorization boundary
7. verification-time artifact revalidation
8. strict baseline-before-improved execution
9. exact partial-state outputs
10. deterministic ID-array ordering
11. deterministic failure precedence
12. source closure/regression correctness
13. locked metric semantics
14. no silent `engine.js` / `mutation-pack.js` redesign

Implementation must also remove temporary/dead validation code introduced while building M10 before merge.

---

## 23. Review Boundary / Stopping Rule

Treat a finding as architecture-blocking only if it demonstrates a concrete contradiction or under-specified behavior in the locked V1 contracts above.

In particular, implementations must not be left free to choose between multiple schemas, field omission/null conventions, ID-array orderings, reject-vs-semantic-state behavior for evaluator execution, or weaker-than-M8 replay validation.

Out of scope remains cryptographic provenance attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic sandbox.
