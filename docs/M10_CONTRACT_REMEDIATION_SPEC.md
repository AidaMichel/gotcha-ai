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

### AI may

- propose one declarative protection statement
- explain why the protection addresses the selected confirmed rule/finding

### AI may not

- generate executable JavaScript that Gotcha runs
- generate callbacks, ASTs, shell commands, or auto-applied patches
- alter the Quality Contract
- change rule severity or kind
- claim the protection has already been proven effective

### Human authority

A remediation proposal is policy-affecting. It must receive an explicit `accept`, `edit`, or `reject` before verification.

### Caller authority

The caller supplies the trusted local synchronous `improvedEvaluator` after implementing the confirmed remediation intent.

The caller also supplies the current/pre-remediation `evaluator` at verification time, but that evaluator is not historical authority. It must reproduce the original M8 baseline before M10 will execute the improved evaluator.

---

## 3. No AI-Generated Executable Protection

The deterministic Mutation Pack path can use developer-authored executable `protectionCheck` callbacks. M8 contract attacks are deliberately model-produced declarative data.

M10 therefore does not execute model-generated remediation code, does not auto-apply patches, and does not bridge contract attacks directly into `runImprovementLoop()`.

---

## 4. Required Additive M8 Experiment Artifact

`runContractAttacks()` adds one successful-result field:

```js
contractAttackResult.experiment
```

The experiment is created inside the same successful M8 invocation. M8 attack generation, validation, evaluator behavior, filtering, ranking, and existing public result fields remain unchanged.

Minimum conceptual shape:

```js
{
  version: 1,
  kind: "contract-attack-experiment",
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
    evaluatorCase
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

`case.input` and `case.expectedOutput` remain canonical AI-safe snapshots for serialization and generator use.

`case.evaluatorCase` is a Gotcha-owned replay snapshot that preserves every evaluator-facing semantic M8 requires to reproduce the original invocation, including supported cross-realm prototype/realm provenance that would be lost by canonicalization alone. It is not independently caller-authored data. Implementations may represent this provenance internally rather than exposing host objects directly, but replay must reconstruct the same evaluator-facing semantics M8 originally observed.

If M8 cannot safely capture/reconstruct a particular supported case's evaluator-facing semantics, that experiment is explicitly **not remediation-replayable** and M8 must not emit a replayable M10 experiment for it. M10 may never silently substitute the canonical value and claim exact replay.

### Normative construction and ownership rule

The experiment must be constructed inside the same successful `runContractAttacks()` invocation from:

- the validated confirmed contract
- exact task identity
- canonical input/expected-output snapshots
- evaluator-facing case provenance needed for exact M8 replay
- the complete retained attack set after M8 filtering/deduplication
- the exact original per-attack results
- original deterministic survivor order
- original top-finding identity

The experiment must be an **independently owned immutable snapshot**. Its nested contract, case, attack, and baseline data must not alias mutable legacy result fields such as `generatedAttacks`, `attack.results`, or `topFinding`. Mutating any existing public M8 result field after return must not mutate `result.experiment`.

Deep snapshot/freeze semantics must cover arrays and nested supported data. Alias-based mutation is a required regression test.

The artifact is structural/canonical binding, not cryptographic attestation against a caller deliberately fabricating a completely new self-consistent history.

---

## 5. Experiment Invariants

An experiment is invalid unless all are true before any protection generator runs:

### Identity

- `version === 1`
- `kind === "contract-attack-experiment"`
- `experiment.task === experiment.contract.task`
- contract is a valid confirmed Quality Contract

### Case

- canonical `input` and `expectedOutput` satisfy the existing AI-safe data policy
- evaluator replay provenance is valid for the exact bound case
- replay cannot fall back from required evaluator provenance to canonical-only semantics

### Attack set

- attack IDs are unique
- every attack references an active confirmed rule
- embedded rule ID/statement/kind/severity matches contract authority exactly
- output satisfies AI-safe data policy
- score dimensions are finite and within `[0, 1]`
- stored severity equals contract-derived severity
- every retained attack output differs from the bound expected output under the same deep-equality semantics M8 uses
- the bound attack set already satisfies the same retained-set deduplication invariants M8 applies before evaluation, including same-rule/deep-equal duplicate filtering
- therefore replaying the artifact through M8 cannot silently remove a bound attack as unchanged or duplicate

### Baseline

- baseline outcome IDs are unique
- there is exactly one outcome per attack ID and no extras
- `evaluatorResult === "PASS"` iff `survived === true`
- `survivorOrderIds` is a duplicate-free permutation of exactly the survived IDs in deterministic original rank order
- `topFindingId` equals the first survivor ID, or `null` when there are none

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

Evaluator replay provenance is Gotcha execution metadata and is not model authority; it is not sent to the protection model unless separately proven AI-safe and intentionally part of the generator contract.

Generator output remains declarative data and must match task/source/rule authority exactly.

---

## 8. Human Confirmation

Allowed decisions:

```js
{ type: "accept" }
```

```js
{ type: "edit", statement: "human-authored statement" }
```

```js
{ type: "reject" }
```

Only the protection statement is editable in M10 V1.

The experiment, source identity, rule ID/statement/kind/severity, and task identity are immutable through confirmation.

Rejected protection cannot verify.

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

## 10. Deterministic Replay Generator

Verification reconstructs a Gotcha-owned deterministic replay generator from `protection.experiment.attacks`.

Each attack maps back to M8 generator input without granting replay data new authority. Severity remains contract-derived by M8.

Verification performs no model/provider call and must reuse `runContractAttacks()` rather than creating a second attack/evaluator safety implementation.

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

`replayCase` reconstructs the bound evaluator-facing semantics from `experiment.case.evaluatorCase`; it is not merely the canonical serialized case when realm/prototype provenance matters.

After baseline replay returns, M10 immediately checks:

- positive control passed
- every attack classification matches the bound original outcome
- survivor order matches exactly
- top finding matches exactly

If baseline identity fails, return `baseline-mismatch` immediately. `improvedEvaluator` must not be called.

### Baseline callback execution failure

A stale/substituted old evaluator may throw, return a non-boolean, or otherwise cause M8 evaluator execution to abort before a complete `attack.results` exists. M10 does **not** invent mismatched IDs for attacks that were never evaluated.

Normative behavior:

- recognize a typed M8 evaluator-execution failure, or wrap the existing M8 failure at the M10 boundary without changing its meaning
- return `state: "baseline-execution-failed"`
- `verificationPassed: false`
- `baselineIdentityPassed: false`
- `baselineMismatchAttackIds: []` unless completed results independently prove specific mismatches before the failure
- include a structured `baselineExecutionError` classification/code, not arbitrary callback stack data as semantic authority
- do not execute `improvedEvaluator`

`baseline-mismatch` is reserved for a completed baseline replay whose observable classifications/order/top-finding differ from the bound history. Execution failure is distinct and deterministic.

### Phase B — improved replay

Only after Phase A passes exactly:

```js
const afterReplay = await runContractAttacks({
  contract: experiment.contract,
  input: replayCase.input,
  expectedOutput: replayCase.expectedOutput,
  evaluator: improvedEvaluator,
  generator: replayGenerator
});
```

The improved replay uses the exact same bound replay case and attack set.

---

## 12. Improved Positive-Control Failure

M8 rejects/throws when an evaluator rejects the known-good expected output before attack results exist. M10 does not create a duplicate positive-control evaluator path.

Therefore an improved positive-control failure is represented as a **partial semantic verification result**, not a fabricated full after-attack result.

Minimum shape for this state:

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

M10 must recognize the specific M8 positive-control failure deterministically. It must not treat an arbitrary improved-evaluator throw/non-boolean attack failure as a positive-control failure.

Other improved callback execution failures reject/throw as evaluator execution errors unless a future public semantic state is explicitly specified.

---

## 13. Source Closure and Regression Detection

After a complete improved replay:

Source closure requires:

```text
bound original baseline: source SURVIVED
baseline replay:         source SURVIVED
after replay:            source CAUGHT
```

A regression is identity-based:

```text
baseline CAUGHT -> after SURVIVED
```

All regression IDs are reported.

Unrelated baseline survivors may remain after a correct narrow fix.

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

`improvement` is descriptive only and can never override correctness gates.

For partial results where no complete after attack result exists, `improvement` is `null`.

---

## 15. Deterministic Verification Failure Precedence

The result exposes all applicable after-replay correctness failures in `failureReasons`, in normative order. `state` is the first item in that ordered set.

Precedence:

```text
1. baseline-execution-failed
2. baseline-mismatch
3. improved-positive-control-failed
4. regression-detected
5. source-finding-still-survives
6. verified
```

Rules:

- Phase A terminal states occur before Phase B and therefore cannot coexist with after-replay failures.
- For a complete after replay, both a regression and an unclosed source may occur simultaneously. In that case:

```js
failureReasons = [
  "regression-detected",
  "source-finding-still-survives"
];
state = "regression-detected";
```

- `verified` is emitted only when `failureReasons` is empty.
- consumers must use the detailed booleans/ID sets for full diagnosis; `state` is only the deterministic primary state.

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

Full successful/complete-replay shape:

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

For `baseline-execution-failed`, `baseline` may be `null` or partial only if the implementation can safely expose completed M8 data; `after` is always `null`; numeric survivor-derived metrics are `null` when their required complete replay does not exist.

For `improved-positive-control-failed`, `baseline` is complete and identity-matched, while `after` is `null` and survivor-derived after metrics are `null`.

Malformed experiment/protection artifacts reject at the public boundary rather than returning semantic verification states.

---

## 18. What PASS Proves

A passing M10 verification proves only:

> On the exact replayable M8-bound original case and complete retained contract-attack set, the supplied baseline evaluator reproduced the original M8 classifications/order/top finding, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove universal correctness, coverage of future attacks, production-model behavior, formal equivalence between the protection statement and evaluator implementation, absence of unseen regressions, or cryptographic historical authenticity.

---

## 19. Trust Model

Untrusted structured data includes serialized/reloaded experiment and protection artifacts plus protection-generator output.

Trusted local executable callbacks include the baseline evaluator, improved evaluator, and injected generator callback.

Historical outcome authority comes from the M8-bound immutable experiment and must be reproduced before comparison.

Evaluator-facing replay provenance is Gotcha-owned execution metadata. It exists solely to reproduce M8 semantics and must not become a caller-editable alternate case.

---

## 20. Preferred Implementation Shape

M10 core:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
```

Additive M8 experiment emission/replay provenance support:

```text
src/contract-attacks.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default. If implementation proves a change is genuinely required, the architecture must be amended before that change.

---

## 21. Required Test Matrix

### M8 experiment emission

- experiment emitted only after successful M8 run
- experiment task equals contract task
- experiment contract/canonical case match same invocation
- evaluator-facing replay provenance reproduces supported cross-realm semantics
- unsupported/unreconstructable evaluator provenance is marked non-replayable rather than silently canonicalized
- experiment attacks exactly match complete retained post-filter/dedupe set
- unchanged-output candidate cannot appear in bound retained attacks
- same-rule/deep-equal duplicate cannot appear in bound retained attacks
- one baseline outcome per attack ID; no omissions/extras
- survivor order/top finding match original result
- experiment data is deeply independently owned from `generatedAttacks`, `attack.results`, and other legacy public fields
- mutating legacy result arrays/attack objects after return cannot mutate experiment
- existing M8 public fields and behavior remain unchanged

### Draft/binding

- valid replayable experiment accepted
- `experiment.task !== contract.task` rejected before generator call
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
- simultaneous regression + source survival returns both ordered `failureReasons` and primary `state: regression-detected`
- unrelated survivors may remain
- `improvement` uses locked net-survivor formula only for complete replays
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

1. M8 emits an independently owned immutable experiment from the same successful invocation
2. experiment binds contract/task, replayable evaluator-facing case semantics, complete retained attacks, original outcomes/order/top finding
3. experiment validation rejects task mismatch and attacks M8 would filter on replay
4. drafting accepts only that experiment plus source ID and generator
5. AI remediation remains declarative only
6. human confirmation is mandatory
7. verification accepts no replacement experiment inputs
8. baseline replay is completed and identity-gated before improved evaluator execution
9. baseline execution failure has deterministic semantics distinct from completed baseline mismatch
10. improved positive-control failure has a defined partial result shape
11. source closure and regressions are identity-based
12. simultaneous failures have deterministic ordered reasons and primary-state precedence
13. improvement uses the locked formula only when both replays are complete
14. cross-realm/replay provenance semantics are preserved or the case is explicitly non-replayable
15. no silent engine/mutation-pack redesign occurs
16. Node/package gates pass
17. dead/temporary validation code introduced during implementation is removed before merge

---

## 23. Review Boundary / Stopping Rule

Treat a new finding as M10 architecture-blocking only if it demonstrates a concrete contradiction or authority gap in this V1 flow, including experiment aliasing/rebinding, replay-semantic loss, baseline history redefinition, AI-to-executable-policy leakage, human-confirmation bypass, ambiguous failure semantics, success despite source/regression/positive-control failure, or a required unapproved M8/engine boundary weakening.

Do not require cryptographic provenance attestation, provider adapters, dashboards, production-model attack execution, AI-generated executable evaluator code, automatic patching, universal future-attack proof, or a generic JavaScript sandbox.
