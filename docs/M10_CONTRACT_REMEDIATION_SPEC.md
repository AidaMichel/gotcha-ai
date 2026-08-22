# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 4
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal

M10 closes the confirmed-contract loop after `GOTCHA` without turning model output directly into executable evaluator policy.

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
AI DRAFTS DECLARATIVE PROTECTION INTENT
  ↓
HUMAN ACCEPT / EDIT / REJECT
  ↓
CALLER IMPLEMENTS TRUSTED IMPROVED EVALUATOR
  ↓
REPLAY THE EXACT ORIGINAL M8 EXPERIMENT
  ↓
BASELINE IDENTITY GATE
  ↓
ONLY THEN RUN IMPROVED REPLAY
  ↓
VERIFY POSITIVE CONTROL + SOURCE CLOSURE + REGRESSIONS
```

The AI proposes what should be protected. A human confirms the intent. The caller owns executable evaluator implementation. Gotcha owns deterministic experiment binding and verification.

---

## 2. Critical Authority Boundary

AI output remains declarative. It may propose a protection statement and rationale, but may not generate executable JavaScript that Gotcha runs, alter the Quality Contract, change rule authority, or claim a fix is already proven.

A human must explicitly accept, edit, or reject remediation intent before verification.

The caller supplies the trusted local synchronous `improvedEvaluator`. The caller also supplies the current/pre-remediation `evaluator`, but that callback is not historical authority: it must reproduce the original bound M8 baseline before M10 will execute the improved evaluator.

---

## 3. No AI-Generated Executable Protection

The deterministic Mutation Pack path can use developer-authored executable `protectionCheck` callbacks. M8 contract attacks are model-produced declarative data.

M10 therefore does not execute model-generated remediation code, auto-apply patches, or bridge contract attacks directly into `runImprovementLoop()`.

---

## 4. Required Additive M8 Experiment Artifact

`runContractAttacks()` adds one successful-result field:

```js
contractAttackResult.experiment
```

The experiment is created inside the same successful M8 invocation. Existing M8 attack generation, validation, evaluator behavior, filtering, ranking, and public result fields remain unchanged.

Minimum conceptual shape:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
  replayable: true,
  task,

  contract: {
    version,
    status,
    task,
    rules
  },

  case: {
    input,
    expectedOutput,
    replay: {
      kind: "m8-evaluator-case-v1"
      // Gotcha-owned evaluator-facing replay representation
    }
  },

  attacks: [/* complete retained attack set */],

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

`case.input` and `case.expectedOutput` are canonical AI-safe snapshots for serialization and generator use.

`case.replay` is a Gotcha-owned representation produced by M8. It preserves or reconstructs every evaluator-facing semantic property M8 supports and that the evaluator could observe during the original run, including supported cross-realm prototype/realm provenance that canonicalization alone would erase. It is never caller-authored alternate case data and is not model authority.

The exact representation is an implementation detail, but its contract is normative: given the same evaluator callback, replay must expose values semantically equivalent to those observed in the original M8 invocation for supported realm/prototype behaviors. Plain canonical cloning is insufficient when those semantics differ.

If M8 cannot safely capture/reconstruct those semantics for a successful run, that result must not become a replayable M10 experiment. The implementation may emit `replayable: false` with a stable reason code or omit the replayable artifact, but M10 drafting must reject it before generator execution. M10 may never silently fall back to canonical-only values and claim exact replay.

### Construction and ownership

The experiment is built from the same invocation's validated contract, exact task, canonical case, evaluator-facing replay representation, complete retained post-filter/post-dedupe attack set, exact original per-attack results, survivor order, and top finding.

Its structural data must be an **independently owned immutable snapshot**. Contract/canonical case/attack/baseline arrays and nested records must not alias mutable legacy result fields such as `generatedAttacks`, `attack.results`, or `topFinding`.

Replay metadata required for evaluator semantics is owned exclusively by the experiment/replay subsystem and must not derive mutable behavior from legacy public result objects. Mutating any existing public M8 result field after return must not mutate experiment structural data or replay behavior.

This is structural/canonical binding, not cryptographic attestation against a caller deliberately fabricating a completely new self-consistent history.

---

## 5. Experiment Invariants

An experiment is invalid unless all are true before any protection generator runs.

### Identity

- `version === 1`
- `kind === "contract-attack-experiment"`
- `replayable === true`
- `experiment.task === experiment.contract.task`
- contract is a valid confirmed Quality Contract

### Case

- canonical `input` and `expectedOutput` satisfy the existing AI-safe data policy
- replay representation is valid for the exact bound case
- replay cannot fall back from required evaluator semantics to canonical-only values

### Attack set

- attack IDs are unique
- every attack references an active confirmed rule
- embedded rule ID/statement/kind/severity matches contract authority exactly
- output satisfies AI-safe data policy
- score dimensions are finite and within `[0, 1]`
- stored severity equals contract-derived severity
- every retained attack output differs from the bound expected output under the same deep-equality semantics M8 uses
- no same-rule/deep-equal retained duplicates exist under M8's retained-set deduplication semantics
- therefore replaying a valid artifact through M8 cannot silently remove a bound attack as unchanged or duplicate

### Baseline

- baseline outcome IDs are unique
- exactly one outcome exists per attack ID and no extras exist
- `evaluatorResult === "PASS"` iff `survived === true`
- `survivorOrderIds` is a duplicate-free permutation of exactly the survived IDs in deterministic original rank order
- `topFindingId` equals the first survivor ID, or `null` when none survive

Any violation rejects the experiment atomically before generator execution.

---

## 6. Locked Public API

M10 adds:

```js
const {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("gotcha-ai");
```

Draft:

```js
const draft = await draftContractProtection({
  experiment: contractAttackResult.experiment,
  sourceAttackId: contractAttackResult.topFinding.id,
  generator: protectionGenerator
});
```

Confirm:

```js
const confirmed = confirmContractProtection({
  draft,
  decision: { type: "accept" }
});
```

Verify:

```js
const verification = await verifyContractProtection({
  protection: confirmed,
  evaluator: oldEvaluator,
  improvedEvaluator
});
```

M10 never accepts an independent verification-time contract, case, expected output, attack set, baseline history, source finding payload, or task identity.

---

## 7. Drafting and Binding

`draftContractProtection()` accepts only:

```js
{
  experiment,
  sourceAttackId,
  generator
}
```

M10 validates the entire experiment before the protection-generator call and snapshots it into the draft. The source ID must resolve to a bound original survivor.

The draft carries the immutable experiment, selected source ID/rule ID, confirmed rule snapshot, and declarative protection statement/rationale.

The generator receives validated canonical data only:

```js
{
  contract: experiment.contract,
  input: experiment.case.input,
  expectedOutput: experiment.case.expectedOutput,
  finding,
  instructions
}
```

Evaluator replay metadata is Gotcha execution authority and is not sent to the protection model by default.

Generator output remains declarative and must match task/source/rule authority exactly.

---

## 8. Human Confirmation

Allowed decisions are `accept`, `edit` of the protection statement only, or `reject`.

The experiment, source identity, rule ID/statement/kind/severity, and task identity are immutable through confirmation. Rejected protection cannot verify.

---

## 9. Evaluator Contract

The caller supplies:

```js
evaluator(output) -> boolean
improvedEvaluator(output) -> boolean
```

Callbacks follow the existing M8 trust model: synchronous, deterministic for the same integration state, side-effect free by contract, and boolean-returning.

M10 does not inspect evaluator source code for semantic equivalence with the protection statement.

---

## 10. Deterministic Replay

Verification reconstructs a Gotcha-owned deterministic replay generator from `protection.experiment.attacks`. Severity remains contract-derived by M8.

Verification performs no model/provider call and must reuse `runContractAttacks()` rather than create a second evaluator-safety implementation.

The replay case is reconstructed by Gotcha from `experiment.case.replay`; it is not caller-provided and is not merely the canonical case when realm/prototype provenance matters.

---

## 11. Strict Two-Phase Verification

Verification is sequential. The improved evaluator must not execute until baseline identity is conclusively accepted.

### Phase A — baseline only

Conceptually:

```js
const baselineReplay = await runContractAttacks({
  contract: experiment.contract,
  input: replayCase.input,
  expectedOutput: replayCase.expectedOutput,
  evaluator,
  generator: replayGenerator
});
```

After baseline replay returns, M10 immediately checks:

- positive control passed
- every attack classification matches the bound original outcome
- survivor order matches exactly
- top finding matches exactly

If baseline identity fails, return `baseline-mismatch` immediately. `improvedEvaluator` must not be called.

### Baseline callback execution failure

A stale/substituted baseline evaluator may throw, return a non-boolean, or otherwise cause M8 evaluator execution to abort before complete results exist. M10 does not invent mismatch IDs for attacks that were never evaluated.

Normative behavior:

- identify failure through stable M8/M10 error classification, not message-text parsing
- return `state: "baseline-execution-failed"`
- `verificationPassed: false`
- `baselineIdentityPassed: false`
- `baselineMismatchAttackIds: []` unless a completed comparison independently established specific mismatches
- include structured `baselineExecutionError.code`
- do not use arbitrary callback stack/message text as semantic authority
- do not execute `improvedEvaluator`

`baseline-mismatch` is reserved for a completed baseline replay whose classifications/order/top finding differ from bound history.

### Phase B — improved replay

Only after Phase A passes:

```js
const afterReplay = await runContractAttacks({
  contract: experiment.contract,
  input: replayCase.input,
  expectedOutput: replayCase.expectedOutput,
  evaluator: improvedEvaluator,
  generator: replayGenerator
});
```

The exact same reconstructed replay case and bound attack set are used.

---

## 12. Improved Positive-Control Failure

M8 rejects/throws when an evaluator rejects the known-good expected output before attack results exist. M10 does not duplicate that positive-control path.

Therefore this is a partial semantic result:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,

  baseline: {
    attack,
    topFinding
  },

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

M10 recognizes this specific M8 failure through stable error classification. Arbitrary improved-evaluator throw/non-boolean failures are not mislabeled positive-control failures; they reject/throw as evaluator execution errors unless a future semantic state is specified.

---

## 13. Source Closure and Regression Detection

After a complete improved replay, source closure requires:

```text
bound original baseline: source SURVIVED
baseline replay:         source SURVIVED
after replay:            source CAUGHT
```

A regression is identity-based:

```text
baseline CAUGHT -> after SURVIVED
```

All regression IDs are reported. Unrelated baseline survivors may remain after a correct narrow fix.

---

## 14. Improvement Metric

For complete baseline + after replays:

```js
improvement =
  baselineReplay.attack.survivors.length -
  afterReplay.attack.survivors.length;
```

`eliminatedAttackIds` means baseline survived → after caught.

`regressionAttackIds` means baseline caught → after survived.

`improvement` is descriptive only. For partial results without a complete after replay, it is `null`.

---

## 15. Deterministic Verification Failure Semantics

Terminal baseline states are phase-ordered and returned before any improved replay:

```text
baseline-execution-failed
baseline-mismatch
```

If Phase A passes but the improved known-good output fails, return:

```text
improved-positive-control-failed
```

For a complete improved replay, compute every applicable correctness failure and order them normatively:

```text
1. regression-detected
2. source-finding-still-survives
```

`failureReasons` contains all applicable items in that order. `state` equals the first failure. If none apply, `state = "verified"` and `verificationPassed = true`.

Example:

```js
failureReasons = [
  "regression-detected",
  "source-finding-still-survives"
];
state = "regression-detected";
```

Detailed booleans and ID sets remain authoritative for diagnosis.

---

## 16. Verification Success Gate

`verificationPassed` is true only when all are true:

1. protection is confirmed and internally valid
2. experiment invariants pass, including task equality and replayability
3. baseline replay completes successfully
4. baseline positive control passes
5. baseline classifications/order/top finding exactly reproduce bound history
6. improved replay completes successfully
7. improved positive control passes
8. selected source is a bound original survivor and reproducibly survives baseline
9. selected source is caught after remediation
10. no baseline-caught attack becomes an after survivor

---

## 17. Verification Output

Full complete-replay shape:

```js
{
  version: 1,
  task,
  sourceAttackId,
  ruleId,
  protection,

  baseline: {
    attack,
    topFinding
  },

  after: {
    attack,
    topFinding
  },

  baselineIdentityPassed,
  baselineMismatchAttackIds,
  baselineExecutionError: null,
  sourceFindingReproduced,
  sourceFindingCaught,
  positiveControlPassed,

  improvement,
  eliminatedAttackIds,
  regressionAttackIds,

  verificationPassed,
  failureReasons,
  state
}
```

For `baseline-execution-failed`, `after` is always `null`; `baseline` is `null` unless a complete safe baseline result exists. Metrics requiring a complete baseline/after pair are `null`.

For `improved-positive-control-failed`, `baseline` is complete and identity-matched, `after` is `null`, and after-derived metrics are `null`.

Malformed experiment/protection artifacts reject at the public boundary rather than return semantic verification states.

---

## 18. What PASS Proves

A passing M10 verification proves only:

> On the exact replayable M8-bound original case and complete retained contract-attack set, the supplied baseline evaluator reproduced the original M8 classifications/order/top finding, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove universal correctness, coverage of future attacks, production-model behavior, formal equivalence between protection text and evaluator implementation, absence of unseen regressions, or cryptographic historical authenticity.

---

## 19. Trust Model

Untrusted structured data includes serialized/reloaded experiment/protection artifacts and protection-generator output.

Trusted local executable callbacks include the baseline evaluator, improved evaluator, and injected generator callback.

Historical outcome authority comes from the M8-bound experiment and must be reproduced before comparison.

Evaluator-facing replay metadata is Gotcha execution authority. It exists solely to reproduce M8 semantics and cannot become caller-editable alternate case data or AI policy authority.

---

## 20. Preferred Implementation Shape

M10 core:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
```

Additive M8 experiment emission/replay support:

```text
src/contract-attacks.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. Any genuine need to change either requires an architecture amendment first.

---

## 21. Required Test Matrix

### M8 experiment emission

- experiment emitted only after successful M8 run
- task equals contract task
- canonical case matches same invocation
- supported cross-realm evaluator-facing semantics replay exactly
- unreconstructable semantics are explicitly non-replayable, never silently canonicalized
- attacks exactly match complete retained post-filter/dedupe set
- unchanged-output candidate cannot appear in retained attacks
- same-rule/deep-equal duplicate cannot appear in retained attacks
- one baseline outcome per attack ID; no omissions/extras
- survivor order/top finding match original result
- structural experiment data is deeply independently owned from legacy public result fields
- mutating legacy result arrays/attack objects cannot mutate experiment structural data or replay behavior
- existing M8 public fields and behavior remain unchanged

### Draft/binding

- valid replayable experiment accepted
- non-replayable experiment rejected before generator call
- task mismatch rejected before generator call
- omitted/extra/duplicate attack or outcome rejected
- unchanged-output attack rejected before generator call
- retained-set duplicate rejected before generator call
- source must resolve to original survivor
- rule/severity authority mismatch rejected
- generator task/source/rule mismatch rejected

### Confirmation

- accept
- edit statement only
- reject
- authority fields and experiment cannot be edited
- rejected protection cannot verify

### Verification

- exact baseline reproduces original identity
- stale baseline classification mismatch returns `baseline-mismatch`
- stale baseline order/top mismatch returns `baseline-mismatch`
- baseline mismatch does not call improved evaluator
- baseline callback throw/non-boolean returns `baseline-execution-failed` and does not call improved evaluator
- no fabricated mismatch IDs for unevaluated attacks
- source survivor → caught succeeds when no regressions
- improved known-good rejection returns partial `improved-positive-control-failed` with `after: null` and `improvement: null`
- arbitrary improved attack callback failure is not mislabeled positive-control failure
- source remains survivor fails
- baseline-caught → after-survived regression fails
- simultaneous regression + source survival returns ordered `failureReasons` and primary `state: regression-detected`
- unrelated survivors may remain
- `improvement` uses the locked formula only for complete replays
- cross-realm replay preserves evaluator-facing behavior

### Runtime/package

- Node 14 minimum-runtime smoke
- Node 22 full suite
- Node 24 full suite
- deterministic no-key example
- packed external consumer can import/use all three public M10 APIs

---

## 22. Acceptance Gates

M10 is complete only when:

1. M8 emits an independently owned replayable experiment from the same successful invocation
2. experiment binds contract/task, evaluator-facing replay semantics, complete retained attacks, original outcomes/order/top finding
3. experiment validation rejects task mismatch and attacks M8 would filter during replay
4. drafting accepts only that experiment plus source ID and generator
5. AI remediation remains declarative only
6. human confirmation is mandatory
7. verification accepts no replacement experiment inputs
8. baseline replay is completed and identity-gated before improved evaluator execution
9. baseline execution failure is distinct from completed baseline mismatch
10. improved positive-control failure has the defined partial result shape
11. source closure and regressions are identity-based
12. simultaneous complete-after failures have deterministic ordered reasons and state precedence
13. improvement uses the locked formula only when both replays are complete
14. evaluator-facing replay semantics are preserved or the experiment is explicitly non-replayable
15. no silent engine/mutation-pack redesign occurs
16. Node/package gates pass
17. dead/temporary validation code introduced during implementation is removed before merge

---

## 23. Review Boundary / Stopping Rule

Treat a new finding as M10 architecture-blocking only if it demonstrates a concrete contradiction or authority gap in this V1 flow, including experiment aliasing/rebinding, replay-semantic loss, baseline history redefinition, AI-to-executable-policy leakage, human-confirmation bypass, ambiguous failure semantics, success despite source/regression/positive-control failure, or required unapproved M8/engine boundary weakening.

Out of scope: cryptographic provenance attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, and a generic JavaScript sandbox.
