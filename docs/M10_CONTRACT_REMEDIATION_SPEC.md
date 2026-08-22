# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 6
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal

M10 closes the confirmed-contract remediation loop without turning model output into executable evaluator policy.

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
M8 EMITS REQUIRED EXPERIMENT VARIANT
  ↓
IF REPLAYABLE: AI DRAFTS DECLARATIVE PROTECTION INTENT
  ↓
HUMAN ACCEPT / EDIT / REJECT
  ↓
CALLER IMPLEMENTS TRUSTED IMPROVED EVALUATOR
  ↓
BASELINE POSITIVE CONTROL + BASELINE REPLAY
  ↓
EXACT BASELINE IDENTITY GATE
  ↓
ONLY THEN IMPROVED POSITIVE CONTROL + IMPROVED REPLAY
  ↓
SOURCE CLOSURE + REGRESSION CHECK
```

The AI proposes declarative protection intent. A human authorizes that intent. The caller owns executable evaluator implementation. Gotcha owns experiment binding, validation, replay, and deterministic verification output.

---

## 2. Authority Boundary

AI/model output remains declarative data only. M10 does not execute AI-generated JavaScript, callbacks, ASTs, shell commands, patches, or evaluator code.

A human must explicitly accept, edit, or reject remediation intent before verification.

The caller supplies trusted local synchronous callbacks:

```js
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

The baseline evaluator is not historical authority. It is a compatibility witness and must reproduce the M8-bound baseline exactly before the improved evaluator can execute.

---

## 3. Required M8 Experiment Emission

Every successful `runContractAttacks()` call MUST return an own `experiment` field. There are exactly two v1 variants.

### 3.1 Replayable experiment

A successful M8 run whose evaluator-facing case is canonically replayable MUST emit exactly:

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
      strategy: "canonical-ai-data"
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

The top-level own keys are exactly:

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

`case` own keys are exactly `input`, `expectedOutput`, `replay`.

`case.replay` own keys are exactly `version`, `kind`, `strategy`, with exact values shown above.

`contract` is the independently owned validated confirmed Quality Contract snapshot under the existing Quality Contract v1 schema.

`case.input` and `case.expectedOutput` are independently owned canonical AI-safe snapshots from the same M8 invocation.

For this V1 strategy, evaluator replay uses canonical clones of those exact case snapshots. A run is eligible for this replayable variant only when canonical replay preserves every evaluator-observable case semantic that M8 supports for that invocation.

### 3.2 Non-replayable experiment

A successful M8 run for which canonical replay would lose evaluator-observable semantics MUST emit exactly:

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

The top-level own keys are exactly `version`, `kind`, `replayable`, `task`, `reason`.

`reason` own keys are exactly `code`, with the exact v1 code above.

No contract, case, attacks, baseline, replay metadata, or alternate reason text is present in the non-replayable v1 variant.

`draftContractProtection()` rejects this variant before invoking the protection generator.

### 3.3 Canonical replayability rule

M10 V1 deliberately does not invent a generic realm/prototype serializer.

If M8's original evaluator-facing case contains supported semantics that canonical AI-safe cloning would not reproduce exactly—for example supported cross-realm prototype/identity behavior—the M8 run remains valid, but its M10 experiment is the required non-replayable variant.

M10 may not silently downgrade such a run to canonical replay and claim exact historical replay.

### 3.4 Independent ownership

Replayable experiment structural data MUST be deeply independently owned from legacy result fields such as `generatedAttacks`, `attack.results`, `survivors`, and `topFinding`.

Mutating legacy public result fields after M8 returns must not change the experiment.

This is structural binding, not cryptographic attestation against deliberate fabrication of a new self-consistent artifact.

---

## 4. Exact Replayable Attack and Baseline Schemas

### 4.1 Bound attack

Every element of `experiment.attacks` has exactly these own keys:

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

The nested `rule` own keys are exactly `id`, `statement`, `kind`, `severity`.

Validation requires:

- attack count is between 0 and 20 inclusive
- `id`, `ruleId`, `type`, `description`, and `rationale` are non-empty strings
- attack IDs are unique
- `ruleId` resolves to an active confirmed rule
- nested rule snapshot exactly equals that confirmed rule's authority fields
- `output` passes the existing AI-safe data policy
- `severity`, `realism`, `subtlety`, `novelty`, and `fixability` are finite numbers in `[0, 1]`
- stored `severity` equals the M8 value derived from confirmed contract severity
- each retained `output` differs from bound `expectedOutput` under M8 deep equality
- there is no same-rule/deep-equal retained duplicate under M8 dedupe semantics

### 4.2 Replay projection

Each bound attack projects back to M8 generator form exactly as:

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

The replay generator itself is exactly:

```js
{
  version: 1,
  task: experiment.task,
  attacks: experiment.attacks.map(projectForM8Replay)
}
```

Before drafting, the projected replay generator MUST satisfy the full current M8 generator validator. If M8 adds a replay-relevant required constraint before M10 implementation lands, M10 must mirror it or use the same side-effect-free validator; M10 may not be knowingly weaker than M8.

### 4.3 Baseline outcome

Every `baseline.outcomes` element has exactly:

```js
{
  attackId,
  evaluatorResult: "PASS" | "FAIL",
  survived: true | false
}
```

The baseline object own keys are exactly `outcomes`, `survivorOrderIds`, `topFindingId`.

Validation requires:

- outcome attack IDs are unique
- exactly one outcome exists for every bound attack and no extras exist
- `evaluatorResult === "PASS"` iff `survived === true`
- `survivorOrderIds` is a duplicate-free permutation of exactly survived IDs in M8 deterministic rank order
- `topFindingId` equals the first survivor ID, or `null` if there are no survivors

---

## 5. Experiment Validation Before Drafting

`draftContractProtection()` accepts only replayable experiments.

Before generator execution M10 validates, from data:

- exact replayable experiment own-key schema
- `version === 1`
- `kind === "contract-attack-experiment"`
- `replayable === true`
- non-empty `task`
- `task === contract.task`
- valid confirmed Quality Contract
- exact case and replay schemas
- AI-safe canonical case snapshots
- exact attack schema and all M8 replay constraints
- exact baseline schema and bijection/rank/top-finding invariants

Extra keys, missing keys, accessors, Proxies, functions, unsupported exotic values, stale versions, or inconsistent authority reject atomically before generator execution.

---

## 6. Locked Public APIs

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

No M10 API accepts a replacement verification-time contract, case, expected output, attack set, baseline history, source finding payload, or task identity.

---

## 7. Exact Protection Generator Input

The generator receives exactly these own keys:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  instructions
}
```

`contract`, `input`, and `expectedOutput` are independent validated snapshots from the replayable experiment.

### 7.1 Exact finding projection

`finding` is independently snapshotted from the selected bound attack and has exactly:

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

It is byte-for-byte/data-equivalent to the selected validated attack snapshot under the artifact's canonical data semantics. The selected attack must have a bound original baseline outcome with `survived: true`.

### 7.2 Exact instructions value

`instructions` is exactly this single string constant for V1:

```text
The confirmed Quality Contract and selected rule are authoritative. Propose one narrow declarative evaluator-protection intent for the selected finding. Preserve unrelated correct behavior. Prefer a rule-level protection over exact-output blacklisting. Return only the required declarative schema. Do not return executable code, callbacks, ASTs, shell commands, patches, contract edits, rule-authority edits, or claims that the protection is already proven effective. Do not claim the production model produced the attack candidate.
```

Implementations may not add provider-specific instructions inside this public generator argument. Provider/model/networking wrappers remain outside M10 core.

---

## 8. Exact Protection Generator Output

The only accepted generator output is:

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

Top-level own keys are exactly `version`, `task`, `sourceAttackId`, `ruleId`, `protection`.

`protection` own keys are exactly `statement`, `rationale`.

Validation requires:

- `version === 1`
- task/source/rule IDs are non-empty strings and exactly match bound authority
- statement and rationale are non-empty strings
- entire return value passes the AI-safe data policy
- extra fields are rejected
- executable/code-bearing values, functions, accessors, Proxies, unsupported exotics, alternate contracts, rule snapshots, experiments, callbacks, patches, or cases are rejected

---

## 9. Draft, Decision, Confirmed, and Rejected Schemas

### 9.1 Draft

A validated generator response produces exactly:

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

Top-level and nested own keys are exact. `source`, `rule`, and `protection` use exactly the keys shown. Draft data is deeply independently owned.

### 9.2 Decisions

Exactly these variants are valid:

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

Each decision variant uses exactly the own keys shown. Extra fields reject. Edit changes only the statement; rationale remains the draft rationale.

### 9.3 Confirmed artifact

Accept/edit returns exactly the draft schema with `status: "confirmed"` and the resulting statement.

### 9.4 Rejected artifact

Reject returns exactly the draft schema with `status: "rejected"` and otherwise unchanged protection content.

Rejected artifacts cannot verify and are rejected at the verification public boundary.

### 9.5 Revalidation

Serialized/reloaded drafts are fully revalidated before confirmation. Serialized/reloaded confirmed artifacts and embedded experiments are fully revalidated before evaluator execution. Object identity is never authority.

---

## 10. Verification Replay Architecture

Verification reconstructs the replay case using canonical clones of:

```js
experiment.case.input
experiment.case.expectedOutput
```

This is valid only because replayable v1 experiments are restricted to `strategy: "canonical-ai-data"` eligibility.

Verification reconstructs the deterministic replay generator from `experiment.attacks` using Section 4.2.

Severity remains M8/contract authority and is re-derived by the reused M8 boundary.

Verification performs no provider/model call and reuses `runContractAttacks()` rather than creating a parallel evaluator engine.

---

## 11. Separate Positive-Control Facts

Revision 6 removes the ambiguous single `positiveControlPassed` field.

Every verification semantic result instead contains both:

```text
baselinePositiveControlPassed
improvedPositiveControlPassed
```

Each is one of `true`, `false`, or `null`.

Semantics:

- `true`: that phase's evaluator completed the known-good control and returned `true`
- `false`: that phase's evaluator completed the known-good control and returned boolean `false`
- `null`: that phase's control did not produce a semantic boolean result or that phase did not run

Phase B is never reported as passed when it was not executed.

---

## 12. Strict Phase A — Baseline Gate

Baseline replay executes first through M8.

### 12.1 Baseline positive-control rejection

If the baseline evaluator returns boolean `false` for the known-good expected output, return state:

```text
baseline-positive-control-failed
```

The improved evaluator is not called.

### 12.2 Baseline execution failure

If the baseline evaluator throws, returns non-boolean, or otherwise cannot produce a valid semantic callback result, return:

```text
baseline-execution-failed
```

The improved evaluator is not called.

### 12.3 Completed baseline identity comparison

Only after the baseline positive control passes and M8 returns complete attack results does M10 compare:

- every bound attack classification by ID
- survivor rank order
- top-finding ID

If any historical fact differs, return:

```text
baseline-mismatch
```

The improved evaluator is not called.

Only exact Phase A identity PASS allows Phase B.

---

## 13. Strict Phase B — Improved Replay

Only after Phase A passes does M10 invoke `improvedEvaluator` through the same reconstructed case and replay generator.

If improved known-good returns boolean `false`, return:

```text
improved-positive-control-failed
```

If the improved evaluator throws, returns non-boolean, or otherwise aborts callback execution, return:

```text
improved-execution-failed
```

Only a complete improved replay proceeds to source-closure/regression comparison.

---

## 14. Exact Verification `protection` Payload

The verification result field named `protection` is NOT the full confirmed artifact.

It is an independently owned snapshot with exactly:

```js
{
  statement,
  rationale
}
```

Those values are copied from the fully revalidated confirmed artifact's nested `protection` object.

The verification result therefore does not recursively embed the experiment or full confirmation artifact.

---

## 15. Canonical Diagnostic Attack-ID Ordering

All public diagnostic attack-ID arrays use bound `experiment.attacks` order filtered by set membership.

This applies to:

```text
baselineMismatchAttackIds
eliminatedAttackIds
regressionAttackIds
```

Any future V1 diagnostic attack-ID array follows the same rule unless its schema explicitly specifies otherwise.

`survivorOrderIds` is the sole exception because it means deterministic M8 survivor rank order.

---

## 16. Uniform Verification Result Schema

Every semantic verification result has exactly these top-level own keys:

```js
{
  version,
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

No semantic state omits a field.

`protection` always has the exact Section 14 shape.

`baseline` and `after`, when non-null, are exactly:

```js
{
  attack,
  topFinding
}
```

and contain the corresponding existing M8 public attack/top-finding snapshots for that completed replay.

---

## 17. Exact Partial Result States

In the objects below, `protection` always means the exact `{ statement, rationale }` snapshot defined in Section 14.

### 17.1 `baseline-positive-control-failed`

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
  baselineExecutionError: null,
  baselinePositiveControlPassed: false,
  improvedPositiveControlPassed: null,
  sourceFindingReproduced: false,
  sourceFindingCaught: false,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["baseline-positive-control-failed"],
  state: "baseline-positive-control-failed"
}
```

### 17.2 `baseline-execution-failed`

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
  baselinePositiveControlPassed: null,
  improvedPositiveControlPassed: null,
  sourceFindingReproduced: false,
  sourceFindingCaught: false,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["baseline-execution-failed"],
  state: "baseline-execution-failed"
}
```

`baselineExecutionError` has exactly one own key, `code`. Callback message/stack text is not semantic authority.

### 17.3 `baseline-mismatch`

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
  baselineMismatchAttackIds,
  baselineExecutionError: null,
  baselinePositiveControlPassed: true,
  improvedPositiveControlPassed: null,
  sourceFindingReproduced: false,
  sourceFindingCaught: false,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["baseline-mismatch"],
  state: "baseline-mismatch"
}
```

`baselineMismatchAttackIds` contains classification-mismatch IDs only, in bound attack order. If only survivor ordering/top finding differs, it is `[]`; the terminal state and baseline payload carry the mismatch fact without invented IDs.

### 17.4 `improved-positive-control-failed`

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
  baselinePositiveControlPassed: true,
  improvedPositiveControlPassed: false,
  sourceFindingReproduced: true,
  sourceFindingCaught: false,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["improved-positive-control-failed"],
  state: "improved-positive-control-failed"
}
```

### 17.5 `improved-execution-failed`

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
  baselinePositiveControlPassed: true,
  improvedPositiveControlPassed: null,
  sourceFindingReproduced: true,
  sourceFindingCaught: false,
  improvement: null,
  eliminatedAttackIds: [],
  regressionAttackIds: [],
  verificationPassed: false,
  failureReasons: ["improved-execution-failed"],
  state: "improved-execution-failed"
}
```

---

## 18. Complete Improved Replay Semantics

For a complete baseline + improved replay:

```text
source reproduced: bound baseline SURVIVED and baseline replay SURVIVED
source caught:     after replay CAUGHT
regression:        baseline CAUGHT -> after SURVIVED
eliminated:        baseline SURVIVED -> after CAUGHT
```

`eliminatedAttackIds` and `regressionAttackIds` use bound experiment attack order.

Normative metric:

```js
improvement =
  baselineReplay.attack.survivors.length -
  afterReplay.attack.survivors.length;
```

The metric is descriptive only.

For a complete improved replay, failure reasons are computed in exactly this order:

```text
1. regression-detected
2. source-finding-still-survives
```

All applicable reasons are emitted in that order. `state` is the first reason. If there are no reasons, `state === "verified"` and `verificationPassed === true`.

Complete results have:

```text
baselineIdentityPassed = true
baselineMismatchAttackIds = []
baselineExecutionError = null
baselinePositiveControlPassed = true
improvedPositiveControlPassed = true
sourceFindingReproduced = true
```

`sourceFindingCaught`, `improvement`, diagnostic ID arrays, `failureReasons`, `state`, and `verificationPassed` are derived as locked above.

---

## 19. State Precedence

Execution is phase-ordered, so only the first applicable terminal phase state can occur:

```text
1. baseline-positive-control-failed
2. baseline-execution-failed
3. baseline-mismatch
4. improved-positive-control-failed
5. improved-execution-failed
6. complete-replay failures/success
```

Within a complete replay, precedence is:

```text
1. regression-detected
2. source-finding-still-survives
3. verified
```

---

## 20. Verification Success Gate

`verificationPassed === true` only when all are true:

1. confirmed protection and embedded replayable experiment pass full exact-schema revalidation
2. baseline positive control returns true
3. baseline replay completes
4. baseline classifications/order/top finding exactly reproduce bound history
5. improved positive control returns true
6. improved replay completes
7. selected source is a bound original survivor and is reproduced as a baseline survivor
8. selected source is caught after remediation
9. no baseline-caught attack becomes an after survivor

Unrelated baseline survivors may remain.

---

## 21. Boundary Rejections vs Semantic States

The following reject/throw at the public API boundary before semantic verification begins:

- malformed M10 call shape
- non-replayable experiment passed to drafting
- malformed/stale/extra-field experiment
- malformed generator output
- malformed draft/decision/confirmed/rejected artifact
- rejected protection passed to verification
- authority mismatch
- unsupported/non-AI-safe structured data

Evaluator outcomes after a valid verification begins use the semantic result states in Sections 17–19.

---

## 22. What PASS Proves

A pass proves only:

> On the exact canonically replayable M8-bound original case and complete retained attack set, the supplied baseline evaluator reproduced the original M8 history, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove universal correctness, future-attack coverage, production-model behavior, formal equivalence between protection text and evaluator implementation, absence of unseen regressions, or cryptographic historical authenticity.

---

## 23. Trust and Serialization Model

Untrusted structured data includes serialized/reloaded replayable and non-replayable experiments, draft/confirmed/rejected protection artifacts, generator output, and confirmation decisions.

All public-boundary structured data is validated from data. Previously validated object identity is never authority.

Trusted local executable callbacks are the baseline evaluator, improved evaluator, and injected generator callback itself. Generator return data remains untrusted.

Gotcha is not a generic JavaScript sandbox.

---

## 24. Preferred Implementation Shape

Expected M10 core:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
```

Additive M8 experiment eligibility/emission support:

```text
src/contract-attacks.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to change either requires an explicit architecture amendment before implementation proceeds.

---

## 25. Required Test Matrix

### M8 experiment variants

- every successful M8 run has own `experiment`
- canonically replayable successful run emits exact replayable v1 schema
- non-canonically-replayable successful run emits exact non-replayable v1 schema
- supported cross-realm/prototype-sensitive M8 run remains valid but is non-replayable for M10 V1
- no successful eligible run may omit experiment
- no canonical fallback is allowed for an ineligible run
- legacy result mutation cannot change replayable experiment

### Replayable experiment validation

- exact top-level/case/replay/attack/rule/baseline/outcome own-key schemas
- extra/missing keys rejected
- task equals contract task
- attack count 0..20 accepted when otherwise valid; >20 rejected
- empty type/description/rationale rejected
- missing/invalid scores rejected
- unchanged output rejected
- same-rule/deep-equal retained duplicate rejected
- omitted/extra/duplicate outcome rejected
- invalid survivor order/top finding rejected

### Generator input/output

- generator receives exactly five top-level keys
- finding exactly equals selected attack projection and no alternate result/rank payload
- instructions exactly equal locked V1 string
- generator output exact schema accepted
- missing/extra generator output keys rejected
- authority mismatch rejected
- unsafe/executable values rejected

### Draft/confirmation

- exact draft schema
- exact accept/edit/reject decision variants
- extra decision keys rejected
- confirmed artifact exact schema
- rejected artifact exact schema and cannot verify
- serialized artifacts fully revalidated

### Verification semantic states

- baseline `false` known-good returns exact `baseline-positive-control-failed`
- baseline throw/non-boolean returns exact `baseline-execution-failed`
- baseline mismatch never calls improved evaluator
- baseline mismatch has improvedPositiveControlPassed `null`
- improved known-good false returns exact `improved-positive-control-failed`
- improved throw/non-boolean returns exact `improved-execution-failed`
- every semantic state has identical top-level key set
- verification `protection` is exactly `{ statement, rationale }`
- no partial state embeds full confirmed artifact as `protection`
- baseline/improved positive-control fields use exact true/false/null semantics
- all diagnostic attack-ID arrays use bound attack order
- survivor order remains M8 rank order
- simultaneous regression + source survival uses ordered reasons
- partial improvement is null; complete improvement uses locked formula

### Runtime/package

- Node 14 minimum-runtime smoke
- Node 22 full suite
- Node 24 full suite
- deterministic no-key example
- packed external consumer imports/uses all three public M10 APIs

---

## 26. Acceptance Gates

M10 architecture is implementation-ready only after a fresh exact-head review finds no concrete contradiction or implementation-choice ambiguity in:

1. mandatory experiment emission
2. exact replayable/non-replayable experiment schemas
3. canonical replay eligibility boundary
4. exact replay attack/baseline schemas
5. exact generator input/output schemas
6. exact draft/decision/confirmed/rejected schemas
7. artifact revalidation
8. strict baseline-before-improved ordering
9. separate baseline/improved positive-control facts
10. exact partial-state outputs
11. exact verification protection payload
12. deterministic ID-array ordering
13. deterministic failure precedence
14. source/regression correctness
15. metric semantics
16. no silent engine/mutation-pack redesign

Temporary/dead validation code introduced during implementation must be removed before merge.

---

## 27. Review Boundary / Stopping Rule

Treat a finding as architecture-blocking only if it demonstrates a concrete contradiction or under-specified V1 behavior in the locked contracts above.

Implementations must not be free to choose between multiple experiment variants, generator projections, artifact schemas, positive-control meanings, protection payload meanings, field omission/null conventions, ID-array orderings, or evaluator-failure return modes.

Out of scope remains cryptographic provenance attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, cross-realm serialization in M10 V1, and a generic sandbox.
