# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 3
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
VERIFY BASELINE IDENTITY + SOURCE CLOSURE + POSITIVE CONTROL + REGRESSIONS
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

A remediation proposal is policy-affecting. It must receive an explicit:

```text
accept
edit
reject
```

before verification.

### Caller authority

The caller supplies the actual trusted local synchronous `improvedEvaluator` after implementing the confirmed remediation intent.

The caller also supplies the current/pre-remediation `evaluator` at verification time, but that evaluator is not trusted as historical truth. It must reproduce the original M8 baseline outcomes bound into the experiment before M10 will compare it with the improved evaluator.

Gotcha verifies observable behavior. Gotcha does not claim to have authored or formally proven either evaluator implementation.

---

## 3. Why M10 Does Not Use AI-Generated `protectionCheck`

The deterministic Mutation Pack path can use `protectionCheck` because that callback is developer-authored trusted local code.

M8 contract attacks are deliberately model-produced declarative data. Adding model-generated executable protection code would collapse the M8 data/code boundary.

Therefore M10 V1 does not bridge contract attacks directly into `runImprovementLoop()`.

A future finite protection DSL or code-generation workflow requires a separate milestone and contract.

---

## 4. Required Additive M8 Experiment Artifact

Revision 3 moves experiment authority to the only place that can bind the original case, complete retained attack set, and original baseline classifications in one operation: `runContractAttacks()` itself.

M10 implementation therefore requires one additive M8 result field:

```js
const contractAttackResult = await runContractAttacks(...);

contractAttackResult.experiment;
```

The attack-generation/evaluation semantics of M8 remain unchanged. `src/engine.js` remains unchanged. This is an additive result artifact produced from values M8 already owns during the successful run.

Minimum artifact shape:

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
    expectedOutput
  },

  attacks: [
    /* complete retained generatedAttacks set */
  ],

  baseline: {
    outcomes: [
      {
        attackId,
        evaluatorResult: "PASS" | "FAIL",
        survived: true | false
      }
    ],
    survivorOrderIds: [
      /* ranked original survivor IDs */
    ],
    topFindingId: "..." | null
  }
}
```

### Normative M8 experiment construction rule

The experiment must be constructed inside the same successful `runContractAttacks()` invocation from:

- the already validated confirmed contract snapshot
- the already canonicalized input snapshot
- the already canonicalized expected-output snapshot
- the complete retained `generatedAttacks` array passed to the deterministic attack engine
- the resulting `attack.results` classifications from that exact array
- the resulting ranked survivor order/top finding

The caller does not provide any of those fields back to M8 to build the artifact.

### Completeness invariants

The artifact is invalid unless:

- attack IDs are unique
- baseline outcome IDs are unique
- there is exactly one baseline outcome for every bound attack ID
- there are no outcome IDs absent from the bound attack set
- `survivorOrderIds` is exactly the set of outcomes with `survived: true`, in original rank order
- `topFindingId` is the first survivor ID or `null` when no survivors exist
- `evaluatorResult === "PASS"` iff `survived === true`
- all attack/rule/severity invariants match the confirmed contract

This is a structural/canonical experiment artifact, not a cryptographic authenticity claim. M10 is designed to prevent accidental or API-level rebinding/subsetting and to reject internally inconsistent/reconstructed artifacts. It does not claim to defend against a caller deliberately fabricating an entirely new self-consistent experiment object and presenting it as historical truth.

---

## 5. Locked Public API

M10 adds:

```js
const {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("gotcha-ai");
```

### Draft

```js
const draft = await draftContractProtection({
  experiment: contractAttackResult.experiment,
  sourceAttackId: contractAttackResult.topFinding.id,
  generator: protectionGenerator
});
```

### Confirm

```js
const confirmed = confirmContractProtection({
  draft,
  decision: {
    type: "accept"
  }
});
```

### Verify

```js
const verification = await verifyContractProtection({
  protection: confirmed,
  evaluator: oldEvaluator,
  improvedEvaluator
});
```

**Normative binding rule:** M10 never accepts a separate contract, input, expected output, attack array, original outcome array, or source finding payload. The only experiment input to drafting is the self-contained M8 experiment artifact, and verification receives that experiment only through the confirmed protection artifact.

---

## 6. Draft Inputs

Required:

```js
{
  experiment,
  sourceAttackId,
  generator
}
```

### experiment

A valid M8 `contract-attack-experiment` artifact satisfying every structural, contract-authority, attack-set, outcome-bijection, survivor-order, and top-finding invariant in this spec.

M10 snapshots the complete experiment before calling the protection generator.

### sourceAttackId

Must identify an attack in `experiment.attacks` whose bound original baseline outcome has `survived: true`.

The selected source finding is resolved from the experiment by ID. The caller does not supply a second independently mutable finding payload.

### generator

Injected provider-independent protection generator.

The caller owns provider/model/credentials/networking/retries. Gotcha owns validation, instructions, provenance, and confirmation boundaries.

---

## 7. Canonical Draft Binding

Before calling the protection generator, M10 validates and snapshots the entire experiment as one unit.

The protection draft carries:

```js
{
  version: 1,
  status: "draft",
  task,

  experiment: {
    version: 1,
    kind: "contract-attack-experiment",
    task,
    contract,
    case,
    attacks,
    baseline
  },

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

The experiment, source identity, and rule authority are not editable during confirmation.

---

## 8. Experiment Validation

M10 independently validates the artifact before any protection-generation call.

### Contract

- valid confirmed Quality Contract
- task/version/status/rules are own validated data
- rules are active confirmed authority

### Case

- input and expectedOutput satisfy the existing AI-safe data policy

### Attack set

For every bound attack validate:

```text
id
ruleId
rule snapshot
type
description
rationale
output
severity
realism
subtlety
novelty
fixability
```

Rules:

- attack IDs unique
- `ruleId` references an active confirmed rule
- embedded rule ID/statement/kind/severity exactly match the confirmed rule
- output satisfies AI-safe data policy
- generator-owned score dimensions are finite in `[0, 1]`
- stored severity equals the score derived from confirmed contract severity

### Bound baseline outcomes

- exactly one outcome per attack ID
- no extra outcome IDs
- outcome `PASS/FAIL` and `survived` agree
- survivor order is a duplicate-free permutation of exactly the survived IDs
- survivor ranking/order is consistent with the bound attack scores and deterministic M8 ranking rules
- top finding ID equals first survivor ID or `null`

If any invariant fails, the experiment is rejected atomically before generator execution.

---

## 9. Protection Generator Arguments

The generator receives validated snapshots:

```js
{
  contract: experiment.contract,
  input: experiment.case.input,
  expectedOutput: experiment.case.expectedOutput,
  finding,
  instructions
}
```

`finding` is resolved from the bound experiment using `sourceAttackId`.

Instructions must state:

- the confirmed rule is authoritative
- propose one narrow evaluator protection intent
- preserve unrelated correct behavior
- prefer rule-level protection over exact-output blacklisting
- return declarative data only
- no functions or executable code
- no contract edits
- no claim of proven effectiveness
- no claim that the production model produced the candidate

---

## 10. Protection Generator Output

Version 1 schema:

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

M10 rejects mismatched task/source/rule identity, empty statement/rationale, malformed metadata, or unsupported AI-safe data.

The generated protection remains `draft` until human confirmation.

---

## 11. Human Confirmation

Input:

```js
{
  draft,
  decision
}
```

Allowed decisions:

```js
{ type: "accept" }
```

```js
{
  type: "edit",
  statement: "human-authored statement"
}
```

```js
{ type: "reject" }
```

Only the protection statement is editable in M10 V1.

Immutable authority/provenance:

```text
entire M8 experiment
source attack ID
rule ID
rule statement
rule kind
rule severity
```

Accepted/edited output uses `status: "confirmed"`. Rejected output uses `status: "rejected"` and cannot verify.

---

## 12. Implementation Handoff

After human confirmation, the caller implements the protection in its evaluator and supplies:

```js
improvedEvaluator(output) -> boolean
```

Both the old evaluator and improved evaluator are trusted local callbacks under the existing evaluator trust model:

- synchronous
- boolean-returning
- deterministic for the same integration state
- side-effect free by contract

If input context is needed, the caller may close over it as in M8.

M10 does not inspect evaluator source code for semantic equivalence with the protection statement.

---

## 13. Verification Inputs

Required and only allowed:

```js
{
  protection,
  evaluator,
  improvedEvaluator
}
```

No new contract/case/attack/outcome/source data may be supplied at verification time.

---

## 14. Deterministic Replay Architecture

Verification reconstructs a Gotcha-owned deterministic replay generator from `protection.experiment.attacks`.

Mapping for each attack:

```text
id          -> id
ruleId      -> ruleId
type        -> type
description -> description
rationale   -> rationale
output      -> mutatedOutput
realism     -> scores.realism
subtlety    -> scores.subtlety
novelty     -> scores.novelty
fixability  -> scores.fixability
```

Severity is not replay-generator authority. `runContractAttacks()` re-derives it from the bound confirmed contract exactly as in M8.

Verification calls the existing M8 boundary twice using only artifact-bound data:

```js
const baselineReplay = await runContractAttacks({
  contract: experiment.contract,
  input: experiment.case.input,
  expectedOutput: experiment.case.expectedOutput,
  evaluator,
  generator: replayGenerator
});
```

```js
const afterReplay = await runContractAttacks({
  contract: experiment.contract,
  input: experiment.case.input,
  expectedOutput: experiment.case.expectedOutput,
  evaluator: improvedEvaluator,
  generator: replayGenerator
});
```

Verification performs no model/provider call.

M10 must not create a parallel attack/evaluator safety implementation.

---

## 15. Baseline Identity Gate

The caller-supplied old `evaluator` is not allowed to redefine history.

Before any remediation-success comparison, M10 compares `baselineReplay.attack.results` with the outcomes bound in `protection.experiment.baseline` by attack ID.

Baseline identity passes only when every bound attack reproduces the original classification exactly:

```text
original PASS/survived  == replay PASS/survived
original FAIL/caught    == replay FAIL/caught
```

The ranked survivor ID order and top-finding ID must also reproduce the bound original survivor order/top finding.

If any original classification/order differs, verification returns:

```text
baseline-mismatch
```

with the mismatched attack IDs and does not claim remediation success.

This gate prevents a substituted/stale old evaluator from changing which attacks count as pre-existing survivors or pre-existing catches.

---

## 16. Source Reproducibility and Closure

The selected source must satisfy both historical and replay truth:

```text
bound original baseline: source SURVIVED
baseline replay:         source SURVIVED
after replay:            source CAUGHT
```

If baseline identity passes but the source is not a baseline survivor, the protection artifact is invalid or the source was selected incorrectly.

If the baseline replay cannot reproduce the bound experiment, state is `baseline-mismatch`, not synthetic remediation success.

If baseline identity passes but the improved evaluator still lets the source survive, state is:

```text
source-finding-still-survives
```

---

## 17. Regression Detection

A replay regression is any bound attack whose original/reproduced baseline classification was caught but whose after classification survives:

```text
baseline: CAUGHT
after:    SURVIVED
```

M10 reports all such IDs.

Because baseline identity must already match the original bound outcomes, the regression set cannot be changed by supplying a different old evaluator.

---

## 18. Improvement Metric

`improvement` is a descriptive net survivor-count delta, not the success gate.

Normative formula:

```js
improvement =
  baselineReplay.attack.survivors.length -
  afterReplay.attack.survivors.length;
```

Properties:

- positive: fewer survivors after remediation
- zero: same survivor count
- negative: more survivors after remediation

`eliminatedAttackIds` is identity-based:

```text
baseline SURVIVED -> after CAUGHT
```

`regressionAttackIds` is identity-based:

```text
baseline CAUGHT -> after SURVIVED
```

A positive `improvement` can never override a regression or failed source closure. `verificationPassed` is governed only by the normative success gate below.

---

## 19. Verification Success Gate

`verificationPassed` is true only when all are true:

1. protection artifact is confirmed and internally valid
2. baseline evaluator passes the bound expected output
3. baseline replay exactly matches every original bound baseline outcome/order/top finding
4. improved evaluator passes the same bound expected output
5. selected source attack is a bound original survivor
6. selected source attack reproducibly survives baseline replay
7. selected source attack is caught after remediation
8. no baseline-caught bound attack becomes an after survivor

Not every unrelated survivor must disappear. A protection may correctly close one selected finding while other independent blind spots remain.

---

## 20. Verification Output

Minimum shape:

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
  sourceFindingReproduced,
  sourceFindingCaught,
  positiveControlPassed,

  improvement,
  eliminatedAttackIds,
  regressionAttackIds,

  verificationPassed,
  state
}
```

Expected states include:

```text
verified
baseline-mismatch
source-finding-still-survives
regression-detected
improved-positive-control-failed
```

Malformed/invalid experiment or protection artifacts throw/reject at the public boundary rather than returning a semantic verification state.

---

## 21. What PASS Proves

A passing M10 verification proves only:

> On the exact M8-bound original case and complete retained validated contract-attack set, the supplied baseline evaluator reproduced the original M8 classifications, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove:

- universal protection correctness
- coverage of every paraphrase/future attack
- production-model behavior
- formal equivalence between protection statement and evaluator code
- enforcement of every contract rule
- absence of unseen regressions
- cryptographic authenticity of a deliberately fabricated caller artifact

README/API claims must stay within this boundary.

---

## 22. Provider Independence

Only `draftContractProtection()` may invoke an injected AI generator.

`confirmContractProtection()` performs no model call.

`verifyContractProtection()` performs no model call.

Provider adapters remain outside M10 core.

---

## 23. Trust Model

Untrusted structured data includes:

- experiment artifacts crossing/re-crossing the public boundary
- contracts/cases/attacks/outcomes contained in those artifacts
- protection-generator output
- serialized/reloaded protection artifacts

Trusted local executable callbacks:

- original evaluator supplied for baseline replay
- improved evaluator
- injected protection generator callback itself

Historical authority is not taken from the replay evaluator callback; it is taken from the M8-bound experiment outcomes and must be reproduced before comparison.

Model-produced data returned by the protection generator remains untrusted.

Gotcha is not a generic JavaScript sandbox.

---

## 24. Preferred Implementation Shape

M10 core:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
```

Additive M8 experiment emission:

```text
src/contract-attacks.js
```

Focused regression coverage should prove the experiment artifact is constructed from the exact validated snapshots/results of the same M8 invocation and that existing M8 public fields/behavior remain unchanged.

After core correctness:

```text
examples/contract-remediation.js
README.md
package.json
package/external-consumer tests
```

M10 must not require changing:

```text
src/engine.js
src/mutation-pack.js
```

If implementation discovers a genuine need to change either file, this architecture spec must be explicitly amended first.

---

## 25. Required Test Matrix

### M8 experiment emission

- experiment emitted only after a successful M8 run
- experiment contract/case snapshots match the same invocation
- experiment attacks exactly match complete retained `generatedAttacks`
- one baseline outcome per attack ID; no omissions/extras
- survivor order/top finding match original attack result
- empty retained attack set binds empty outcomes/order and null top finding
- existing M8 result fields and deterministic behavior remain unchanged

### Draft/binding

- valid M8 experiment accepted
- bare attack arrays are not an API
- experiment with omitted attack but stale outcome rejected
- experiment with omitted outcome rejected
- experiment with substituted attack payload but stale outcome/ranking metadata rejected where invariants disagree
- duplicate attack/outcome IDs rejected
- source ID must resolve to bound original survivor
- attack rule/severity mismatch rejected
- malformed/function/Proxy/accessor data rejected
- generator task/source/rule mismatch rejected

### Confirmation

- accept
- edit statement only
- reject
- authority fields cannot be edited
- entire experiment remains unchanged through confirmation
- rejected protection cannot verify

### Verification

- no verification-time contract/case/attack/outcome/source substitution API exists
- exact old evaluator reproduces original baseline -> baseline identity PASS
- substituted/stale old evaluator changing any classification -> `baseline-mismatch`
- substituted/stale old evaluator changing survivor order/top finding -> `baseline-mismatch`
- source survivor -> caught = success when no regressions
- improved known-good rejection = fail
- source remains survivor = fail
- original baseline-caught attack -> after survivor = regression + fail
- unrelated survivors may remain
- severity stays contract-derived during replay
- `improvement` equals baseline survivor count minus after survivor count
- positive net improvement cannot hide identity-level regression
- M8 duplicate/ranking semantics remain intact

### Runtime/package

- Node 14 minimum-runtime smoke
- Node 22 full suite
- Node 24 full suite
- deterministic no-key example
- packed external consumer can import/use all three public M10 APIs

---

## 26. Acceptance Gates

M10 is complete only when:

1. M8 emits one self-contained contract-attack experiment artifact from the same successful invocation
2. experiment binds confirmed contract + original case + complete retained attack set + original baseline classifications/order/top finding
3. drafting accepts the experiment artifact rather than separately reassembled contract/case/attack inputs
4. source identity resolves only inside that experiment and must be an original survivor
5. AI-generated remediation remains declarative only
6. human confirmation is mandatory
7. confirmed artifact carries the experiment unchanged
8. verification accepts no substitute experiment inputs
9. caller supplies the executable improved evaluator
10. verification reuses M8 replay/evaluator boundary
11. caller-supplied old evaluator must reproduce the bound original baseline exactly before comparison
12. known-good is preserved after remediation
13. selected source finding is caught after remediation
14. replay regressions are identity-tracked and reported
15. `improvement` uses the locked net-survivor formula and never overrides correctness gates
16. no silent engine/mutation-pack redesign occurs
17. Node 14/22/24 + package gates pass
18. temporary validation infrastructure is removed before merge

---

## 27. Review Boundary / Stopping Rule

Treat a new finding as M10 architecture-blocking only if it demonstrates a concrete contradiction or authority gap in the documented V1 flow, including:

- the original M8 experiment can be accidentally rebound/subset through the public M10 API without detection
- baseline history can be redefined by a substituted evaluator without producing `baseline-mismatch`
- AI/model-produced data can become executable policy
- human confirmation can be bypassed
- verification can claim success while source closure/positive control/regression gates fail
- the public metric/output contract is ambiguous or nondeterministic
- the design requires bypassing M8 or silently changing `src/engine.js` / `src/mutation-pack.js`

Do not require:

- cryptographic attestation against a caller deliberately fabricating a new self-consistent historical artifact
- production-provider adapters
- AI-generated executable evaluator code
- dashboards
- automatic patch application
- universal/future-attack correctness proof
- a general JavaScript sandbox

M10 V1 is a deterministic experiment-remediation verifier over a self-contained M8-bound replay artifact, not a provenance security system for hostile callers.
