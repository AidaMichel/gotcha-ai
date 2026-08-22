# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Revision 2
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
REPLAY THE SAME ORIGINAL ATTACK SET
  ↓
VERIFY SOURCE CLOSURE + POSITIVE CONTROL + REGRESSIONS
```

The AI proposes what should be protected. A human confirms the intent. The caller owns executable evaluator implementation. Gotcha owns deterministic verification.

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

Gotcha verifies observable behavior. Gotcha does not claim to have authored or formally proven that evaluator implementation.

---

## 3. Why M10 Does Not Use AI-Generated `protectionCheck`

The deterministic Mutation Pack path can use `protectionCheck` because that callback is developer-authored trusted local code.

M8 contract attacks are deliberately model-produced declarative data. Adding model-generated executable protection code would collapse the M8 data/code boundary.

Therefore M10 V1 does not bridge contract attacks directly into `runImprovementLoop()`.

A future finite protection DSL or code-generation workflow requires a separate milestone and contract.

---

## 4. Locked Public API

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
  contract,
  input,
  expectedOutput,
  attacks:
    contractAttackResult.generatedAttacks,
  sourceAttackId:
    contractAttackResult.topFinding.id,
  generator:
    protectionGenerator
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
  evaluator:
    oldEvaluator,
  improvedEvaluator
});
```

**Normative binding rule:** `verifyContractProtection()` does not accept a new contract, case, attack set, or source attack ID. Those values are carried immutably through the protection artifact from drafting to confirmation. This prevents verification from silently switching to a different case or a partial/substituted attack set.

---

## 5. Draft Inputs

Required:

```js
{
  contract,
  input,
  expectedOutput,
  attacks,
  sourceAttackId,
  generator
}
```

### contract

A valid confirmed Quality Contract. M10 independently validates it.

### input / expectedOutput

The exact eval case that produced the attack set.

### attacks

The complete `generatedAttacks` array from the original `runContractAttacks()` result.

M10 V1 binds remediation to this complete replay set at draft time. It does not accept `attack.results`, `survivors` only, or a later caller-selected subset.

Every entry is independently validated against the confirmed contract.

### sourceAttackId

Identifies the selected survivor within the complete original generated attack set.

The selected source attack is resolved from `attacks` by ID; the caller does not supply a second independently mutable finding payload.

### generator

Injected provider-independent protection generator.

The caller owns provider/model/credentials/networking/retries. Gotcha owns validation, instructions, provenance, and confirmation boundaries.

---

## 6. Canonical Draft Binding

Before calling the protection generator, M10 snapshots and validates:

```text
contract
input
expectedOutput
complete attack set
source attack ID
```

The protection draft must carry the canonical frozen snapshot:

```js
{
  version: 1,
  status: "draft",
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
    /* complete validated original generatedAttacks set */
  ],

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

The contract, case, attack set, source identity, and rule authority are not editable during confirmation.

This binding is structural/canonical, consistent with existing Gotcha serialized-data authority. M10 does not claim cryptographic signing of user-supplied artifacts.

---

## 7. Attack-Set Validation

For every bound attack, M10 validates:

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

- attack IDs must be unique
- `ruleId` must reference an active confirmed rule
- embedded rule ID/statement/kind/severity must exactly match the confirmed rule
- attack output must satisfy the existing AI-safe data policy
- generator-owned score dimensions must be finite numbers in `[0, 1]`
- stored severity must equal the score derived from confirmed contract severity
- sourceAttackId must identify one attack in this exact set

The selected source attack is the canonical attack-set entry, not a separate caller-provided object.

---

## 8. Protection Generator Arguments

The generator receives validated snapshots:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  instructions
}
```

`finding` is resolved from the bound attack set using `sourceAttackId`.

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

## 9. Protection Generator Output

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

## 10. Human Confirmation

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

The following are immutable authority/provenance:

```text
contract
case
complete attack set
task
source attack ID
rule ID
rule statement
rule kind
rule severity
```

Accepted/edited output uses `status: "confirmed"`. Rejected output uses `status: "rejected"` and cannot verify.

The confirmed artifact preserves the same canonical contract/case/attack-set snapshots from the draft.

---

## 11. Implementation Handoff

After human confirmation, the caller implements the protection in its evaluator and supplies:

```js
improvedEvaluator(output) -> boolean
```

The improved evaluator is a trusted local callback under the existing evaluator trust model:

- synchronous
- boolean-returning
- deterministic for the same integration state
- side-effect free by contract

If input context is needed, the caller may close over it as in M8.

M10 does not inspect evaluator source code for semantic equivalence with the protection statement.

---

## 12. Verification Inputs

Required and only allowed:

```js
{
  protection,
  evaluator,
  improvedEvaluator
}
```

### protection

Must be a valid `status: "confirmed"` M10 artifact containing its bound confirmed contract, original case, complete original attack set, selected source, and rule provenance.

### evaluator

Current/pre-remediation trusted local evaluator.

### improvedEvaluator

Caller-supplied post-remediation trusted local evaluator.

No new case or attack data may be substituted at verification time.

---

## 13. Deterministic Replay Architecture

Verification reconstructs a Gotcha-owned deterministic replay generator from `protection.attacks`.

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

Severity is not replay-generator authority. `runContractAttacks()` must re-derive it from `protection.contract` exactly as in M8.

Verification then calls the existing M8 boundary twice using the artifact-bound values:

```js
await runContractAttacks({
  contract: protection.contract,
  input: protection.case.input,
  expectedOutput:
    protection.case.expectedOutput,
  evaluator,
  generator: replayGenerator
});
```

and:

```js
await runContractAttacks({
  contract: protection.contract,
  input: protection.case.input,
  expectedOutput:
    protection.case.expectedOutput,
  evaluator: improvedEvaluator,
  generator: replayGenerator
});
```

Verification performs no model/provider call.

M10 must not create a parallel attack/evaluator safety implementation.

---

## 14. Source Reproducibility

M10 never trusts a historical `survived: true` flag.

At verification time it recomputes baseline behavior against the bound original replay set.

The source finding is reproducible only when:

```text
baseline replay: selected source attack SURVIVED
```

If it is no longer a baseline survivor, verification returns an explicit:

```text
source-finding-not-reproducible
```

state and does not claim remediation success.

---

## 15. Regression Detection

A replay regression is any bound attack that:

```text
baseline: CAUGHT
after:    SURVIVED
```

M10 reports all such IDs.

Survivor-count improvement alone is insufficient because equal or lower survivor counts can hide identity-level regressions.

---

## 16. Verification Success Gate

`verificationPassed` is true only when all are true:

1. baseline evaluator passes the bound `expectedOutput`
2. improved evaluator passes the same bound `expectedOutput`
3. selected source attack reproducibly survives baseline
4. selected source attack is caught after remediation
5. no baseline-caught bound attack becomes an after survivor

Not every unrelated survivor must disappear. A protection may correctly close one selected finding while other independent blind spots remain.

---

## 17. Verification Output

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
source-finding-not-reproducible
source-finding-still-survives
regression-detected
improved-positive-control-failed
```

---

## 18. What PASS Proves

A passing M10 verification proves only:

> On the exact bound original case and complete bound original validated contract-attack set, the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

It does not prove:

- universal protection correctness
- coverage of every paraphrase/future attack
- production-model behavior
- formal equivalence between protection statement and evaluator code
- enforcement of every contract rule
- absence of unseen regressions

README/API claims must stay within this boundary.

---

## 19. Provider Independence

Only `draftContractProtection()` may invoke an injected AI generator.

`confirmContractProtection()` performs no model call.

`verifyContractProtection()` performs no model call.

Provider adapters remain outside M10 core.

---

## 20. Trust Model

Untrusted structured data includes:

- contracts crossing the public boundary
- case input/expected output
- attack-set data
- protection-generator output
- serialized/reloaded protection artifacts

Trusted local executable callbacks:

- original evaluator
- improved evaluator
- injected protection generator callback itself

Model-produced data returned by that callback remains untrusted.

Gotcha is not a generic JavaScript sandbox.

---

## 21. Preferred Implementation Shape

Additive module:

```text
src/contract-remediation.js
```

Public exports:

```text
src/index.js
```

Focused tests:

```text
test/contract-remediation.test.js
```

After core correctness:

```text
examples/contract-remediation.js
README.md
package.json
package/external-consumer tests
```

M10 should not require changing:

```text
src/engine.js
src/mutation-pack.js
```

If implementation discovers a genuine need to change either file, the architecture spec must be explicitly amended first.

Prefer consuming the existing `runContractAttacks()` contract unchanged.

---

## 22. Required Test Matrix

### Draft/binding

- valid complete attack set is bound into draft
- source ID resolves to canonical attack-set entry
- unknown source ID rejected
- duplicate attack IDs rejected
- attack rule mismatch rejected
- attack severity mismatch rejected
- malformed/function/Proxy/accessor data rejected
- generator task/source/rule mismatch rejected
- async native-Promise generator supported within the chosen callback boundary

### Confirmation

- accept
- edit statement only
- reject
- authority fields cannot be edited
- contract/case/attack-set snapshots remain unchanged through confirmation
- rejected protection cannot verify

### Verification

- no verification-time contract/case/attack-set substitution API exists
- source survivor -> caught = success when no regressions
- improved known-good rejection = fail
- source remains survivor = fail
- changed baseline no longer reproduces source = explicit non-reproducible
- baseline-caught attack -> after survivor = regression + fail
- unrelated survivors may remain
- severity stays contract-derived during replay
- M8 duplicate/ranking semantics remain intact

### Runtime/package

- Node 14 minimum-runtime smoke
- Node 22 full suite
- Node 24 full suite
- deterministic no-key example
- packed external consumer can import/use all three public M10 APIs

---

## 23. Acceptance Gates

M10 is complete only when:

1. all three public APIs match this authority model
2. AI-generated output remains declarative only
3. human confirmation is mandatory
4. confirmed artifact binds contract + original case + complete original attack set + source identity
5. verification accepts no substitute case/attack-set inputs
6. caller supplies the executable improved evaluator
7. verification reuses M8 replay/evaluator boundary
8. source finding is recomputed, not trusted historically
9. known-good is preserved after remediation
10. source finding is caught after remediation
11. replay regressions are identity-tracked and reported
12. no silent engine/mutation-pack redesign occurs
13. Node 14/22/24 + package gates pass
14. README claims remain narrow
15. exact-head adversarial review has no unresolved material M10 issue

---

## 24. Not M10

M10 does not include:

- AI-generated executable protection code
- automatic source-code patches/commits
- generic JavaScript sandboxing
- provider-specific adapters
- hosted model execution
- attacks against the production AI model
- dashboards/observability/collaboration
- persistence/database state
- automatic Quality Contract edits
- batch multi-finding remediation
- protection DSL
- formal semantic proof
- automatic deployment

---

## 25. Review Stopping Rule

A material M10 blocker must show a reproducible contract violation such as:

- model-produced executable behavior crossing the data boundary
- human confirmation bypass
- contract authority changed by remediation data
- verification switching to a different case or incomplete/substituted attack set
- success while source finding still survives
- success while improved evaluator rejects known-good output
- unreported replay regression
- stale historical survivor metadata trusted instead of baseline replay
- package/public behavior contradicting this contract
- normal supported Node 14/22/24 regression caused by M10

Not blockers without a concrete contract violation:

- arbitrary sandbox requests
- AI-generated evaluator-code requests
- provider integrations
- production-model attacks
- dashboards
- future DSL/codegen
- unrelated engine redesign

---

## 26. Locked Architecture Summary

```text
AI:
proposes declarative protection intent

HUMAN:
accepts / edits / rejects

CONFIRMED ARTIFACT:
binds the confirmed contract,
original case,
complete original attack set,
and selected source finding

CALLER:
implements improved evaluator

GOTCHA:
replays that exact bound experiment
and verifies positive control,
source closure,
and identity-level regressions
```

The central rule is:

> Verification may not silently change the experiment that the human remediation decision was based on.
