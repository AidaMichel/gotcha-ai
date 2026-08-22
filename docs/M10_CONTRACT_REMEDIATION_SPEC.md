# M10 — Contract Remediation & Re-Attack

Status: Architecture Locked — Implementation Not Started
Milestone: 10
Branch: `milestone-10-contract-remediation`
Base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`

## 1. Goal

M10 closes the confirmed-contract quality loop without allowing AI-generated executable code to become evaluator policy.

M7 implemented:

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
```

M8 and M9 implemented and exposed:

```text
CONFIRMED CONTRACT
       ↓
ATTACK
       ↓
RANK
       ↓
GOTCHA
```

The current contract-driven path intentionally stops at a ranked survivor.

M10 adds the remediation handoff:

```text
GOTCHA
  ↓
AI DRAFTS PROTECTION INTENT
  ↓
HUMAN CONFIRMS
  ↓
CALLER IMPLEMENTS IMPROVED EVALUATOR
  ↓
GOTCHA REPLAYS THE SAME ATTACK SET
  ↓
VERIFY IMPROVEMENT / REGRESSION
```

The complete product story becomes:

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
CATCH THIS
  ↓
IMPLEMENT
  ↓
RE-ATTACK
```

M10 does not pretend that natural-language remediation can be compiled safely into arbitrary executable JavaScript by the AI generator.

The AI proposes remediation intent as declarative data. A human confirms that intent. The caller owns the executable evaluator implementation. Gotcha owns deterministic replay and verification.

---

## 2. Product Promise

After Gotcha finds a contract-driven evaluator blind spot, the user should not be left with only:

> `wrong-time survived`

Gotcha should be able to help answer:

1. What should the evaluator protect now?
2. Does a human agree with that protection intent?
3. After the evaluator is changed, does the known-good output still pass?
4. Is the original blind spot now caught?
5. Did the updated evaluator regress on attacks the old evaluator already caught?
6. How many previously surviving attacks were eliminated?

Example:

```text
Confirmed rule:
The scheduled time must match the requested time.

Surviving attack:
Sara was requested at 3 PM.
The evaluator accepted 4 PM.
```

Gotcha may draft:

```text
Protection intent:
Reject scheduled outputs whose actual time differs from the explicitly requested time.
```

The human may:

```text
accept
edit
reject
```

If accepted or edited, the caller implements an improved evaluator.

Gotcha then replays the exact validated attack set against:

```text
old evaluator
vs
improved evaluator
```

and reports measurable change.

---

## 3. Why M10 Exists

The repository currently has two different remediation realities.

The deterministic Mutation Pack path already has executable trusted protection checks. Therefore its improvement loop can compose the existing evaluator with a `protectionCheck` and re-attack immediately.

The confirmed-contract attack path is deliberately different. M8 attack candidates are model-produced declarative data and contain no executable protection callback.

That distinction is a safety property, not a missing implementation detail.

M10 exists to close the loop while preserving that boundary.

The correct bridge is not:

```text
AI survivor
  ↓
AI writes JavaScript protection
  ↓
Gotcha executes it
```

The correct bridge is:

```text
AI survivor
  ↓
AI proposes declarative protection intent
  ↓
human confirms intent
  ↓
caller supplies trusted improved evaluator
  ↓
Gotcha verifies behavior
```

---

## 4. Critical Product Boundary

### 4.1 AI proposes remediation intent, never executable evaluator code

The protection generator may return only declarative structured data.

It must not return or cause Gotcha to execute:

- JavaScript functions
- callback source
- `eval(...)`
- `new Function(...)`
- AST intended for automatic execution
- regex/code snippets that Gotcha evaluates as code
- shell commands
- patches that Gotcha automatically applies
- provider tool calls that mutate the repository

A generated string is always data.

M10 never executes model-generated strings.

### 4.2 The human is authoritative over protection intent

Unlike M8 attack candidates, remediation changes what the evaluator should reject.

That is policy-affecting behavior.

Therefore a protection draft must receive explicit human confirmation before verification is allowed.

Allowed decisions:

```text
accept
edit
reject
```

### 4.3 The caller is authoritative over executable implementation

M10 V1 does not compile the protection statement into code.

The caller provides the trusted local synchronous `improvedEvaluator` that represents the implemented change.

Gotcha verifies that evaluator. Gotcha does not claim to have authored it.

### 4.4 The confirmed Quality Contract remains authoritative

A protection may reference one active confirmed contract rule.

It may not:

- add a rule
- remove a rule
- edit a rule
- change rule kind
- change rule severity
- revive a rejected rule
- silently change the task

If the user wants to change the Quality Contract, that remains a Quality Contract workflow, not M10 remediation.

---

## 5. Locked M10 Flow

M10 operates on one survivor at a time.

```text
confirmed contract
      +
input
      +
known-good output
      +
selected surviving attack
      ↓
DRAFT PROTECTION
      ↓
HUMAN CONFIRM
      ↓
IMPLEMENT OUTSIDE GOTCHA CORE
      ↓
VERIFY PROTECTION
      ↓
BASELINE REPLAY
      ↓
IMPROVED-EVALUATOR REPLAY
      ↓
COMPARE
```

Batch remediation of several findings in one proposal is outside M10 V1.

---

## 6. Public API

M10 adds three public functions:

```js
const {
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("gotcha-ai");
```

The intended flow is:

```js
const draft =
  await draftContractProtection({
    contract,
    input,
    expectedOutput,
    finding:
      contractAttackResult.topFinding,
    generator:
      protectionGenerator
  });

const confirmed =
  confirmContractProtection({
    draft,
    decision: {
      type: "accept"
    }
  });

const verification =
  await verifyContractProtection({
    contract,
    input,
    expectedOutput,
    attacks:
      contractAttackResult.generatedAttacks,
    sourceAttackId:
      contractAttackResult.topFinding.id,
    evaluator:
      oldEvaluator,
    improvedEvaluator,
    protection:
      confirmed
  });
```

`draftContractProtection()` is asynchronous because the injected protection generator may be asynchronous.

`confirmContractProtection()` is deterministic and synchronous.

`verifyContractProtection()` returns a Promise because it intentionally reuses the asynchronous M8 `runContractAttacks()` boundary internally, even though verification itself performs no model call.

---

## 7. `draftContractProtection()` Inputs

Required:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  generator
}
```

### contract

A valid confirmed Quality Contract.

M10 independently validates it at its own boundary.

### input

The concrete eval input associated with the finding.

### expectedOutput

The known-good output associated with the finding.

### finding

One surviving M8-style generated attack.

Minimum semantic fields:

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

M10 must validate the finding as data and verify that:

- `finding.ruleId` references an active confirmed contract rule
- `finding.rule.id === finding.ruleId`
- the finding's rule statement/kind/severity exactly match the confirmed contract rule
- `finding.output` is valid AI-safe data
- scoring metadata is structurally valid

M10 does not trust object identity or assume the finding came directly from the same process invocation.

### generator

An injected provider-independent protection generator.

The caller owns:

- provider
- model
- credentials
- networking
- retries
- provider-specific parsing

Gotcha owns:

- generator instructions
- schema
- validation
- contract authority
- provenance
- human-confirmation boundary

---

## 8. Protection Generator Arguments

The generator receives only validated snapshots:

```js
{
  contract,
  input,
  expectedOutput,
  finding,
  instructions
}
```

The generator must not receive mutable source identities that bypass the existing AI-data boundary.

The generator instructions must explicitly state:

- the confirmed rule is authoritative
- do not change the rule
- propose one evaluator protection intent for the selected finding
- preserve unrelated correct behavior
- do not write executable code
- do not return functions
- do not claim the protection is proven effective
- do not claim the production model produced the finding
- prefer the narrowest protection that addresses the confirmed rule without encoding the exact bad output as a one-off blacklist

---

## 9. Protection Draft Schema

Generator output version:

```text
1
```

Required shape:

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

Example:

```js
{
  version: 1,

  task:
    "Schedule meetings using the requested person and time.",

  sourceAttackId:
    "wrong-time",

  ruleId:
    "time-rule",

  protection: {
    statement:
      "Reject a scheduled result when its actual meeting time differs from the explicitly requested time.",

    rationale:
      "The current evaluator accepted a candidate that preserved the person but changed the confirmed requested time."
  }
}
```

The draft is declarative only.

No field in the V1 schema is executable.

---

## 10. Draft Validation

M10 must reject generator output when:

- version is unsupported
- task does not exactly match the confirmed contract task
- source attack ID does not exactly match the selected finding
- rule ID does not exactly match the finding and confirmed contract rule
- protection statement is empty
- rationale is empty
- data contains unsupported AI-safe values
- data contains executable own-property behavior
- Proxy-backed or accessor-backed metadata crosses the boundary
- the generator returns a malformed Promise/runtime object outside the supported M8-style callback boundary

The generated protection is not authoritative merely because it passes schema validation.

Its status is:

```text
draft
```

until a human decision is applied.

---

## 11. `draftContractProtection()` Output

Normalized output:

```js
{
  version: 1,
  status: "draft",
  task,

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

The rule snapshot comes from the confirmed contract, not from generator authority.

---

## 12. `confirmContractProtection()`

Input:

```js
{
  draft,
  decision
}
```

Allowed decision shapes:

### Accept

```js
{
  type: "accept"
}
```

### Edit

```js
{
  type: "edit",
  statement:
    "...human-authored protection statement..."
}
```

### Reject

```js
{
  type: "reject"
}
```

Only the protection statement is editable in M10 V1.

The human may not use the remediation decision to change:

- task
- source attack ID
- rule ID
- contract rule statement
- rule kind
- rule severity

Those fields are provenance/authority, not editable remediation text.

---

## 13. Confirmation Outputs

### Accepted or edited

```js
{
  version: 1,
  status: "confirmed",
  task,

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
    rationale,
    decision:
      "accept" | "edit"
  }
}
```

For an edit, `statement` is the human-authored value.

Generator rationale may remain as non-authoritative provenance/context.

### Rejected

```js
{
  version: 1,
  status: "rejected",
  ...provenance
}
```

A rejected protection cannot be passed to verification.

---

## 14. Why M10 Does Not Generate `protectionCheck`

The existing deterministic Mutation Pack path can safely contain a trusted local `protection.check()` callback because the developer authored that callback as local code.

M8 deliberately prevents the model from generating executable mutation code.

M10 extends the same rule to remediation.

Allowing a model to return:

```js
{
  check(output) {
    // model-produced executable code
  }
}
```

would collapse the data/code boundary M8 was designed to preserve.

Therefore M10 V1 does not attempt universal natural-language-to-code compilation.

A future milestone may define a finite declarative protection DSL or provider-specific implementation tooling, but that is explicitly outside M10.

---

## 15. Implementation Handoff

After confirmation, the caller implements the protection in its evaluator.

The caller then provides:

```js
improvedEvaluator(output) -> boolean
```

The improved evaluator is a trusted local callback under the same trust model as the existing evaluator.

It must be:

- synchronous
- boolean-returning
- deterministic for the same input state
- side-effect free by contract

If the evaluator needs request/input context, the caller may close over it exactly as in M8.

M10 does not inspect evaluator source code to determine whether the confirmed protection was implemented “correctly.”

It verifies observable behavior on the replayed attack set.

---

## 16. `verifyContractProtection()` Inputs

Required:

```js
{
  contract,
  input,
  expectedOutput,
  attacks,
  sourceAttackId,
  evaluator,
  improvedEvaluator,
  protection
}
```

### attacks

The full `generatedAttacks` set from the contract-attack run, not only the source survivor.

M10 V1 verifies against the exact previously generated candidate set.

Every attack must be independently validated against the confirmed contract before replay.

### sourceAttackId

Identifies the finding the confirmed protection intends to remediate.

The source attack must be present in the replay set.

### evaluator

The pre-remediation evaluator.

### improvedEvaluator

The caller-supplied post-remediation evaluator.

### protection

Must be a valid `status: "confirmed"` M10 protection tied to the same task, rule, and source attack.

---

## 17. Deterministic Replay Architecture

M10 must reuse the existing M8 `runContractAttacks()` boundary rather than duplicating its evaluator/data hardening.

The implementation should construct an internal deterministic replay generator from the validated attack set.

Conceptually:

```js
function replayGenerator() {
  return {
    version: 1,
    task,
    attacks: replayAttacks
  };
}
```

This is trusted Gotcha-owned replay data reconstructed from validated attacks. It performs no model call and introduces no new attack candidates.

M10 then runs:

```text
BASELINE
runContractAttacks({
  contract,
  input,
  expectedOutput,
  evaluator,
  generator: replayGenerator
})
```

and:

```text
AFTER
runContractAttacks({
  contract,
  input,
  expectedOutput,
  evaluator: improvedEvaluator,
  generator: replayGenerator
})
```

This preserves:

- M8 positive-control validation
- M8 canonical AI-data validation
- M8 generated-attack schema validation
- M8 evaluator snapshot behavior
- M8 Node cross-realm compatibility boundary
- M8 callback/intrinsic restoration behavior
- M8 deterministic attack ranking

M10 must not create a second parallel evaluator-safety implementation.

---

## 18. Replay Identity

The replay conversion must preserve the semantic attack identity necessary for M8 validation and ranking:

```text
id
ruleId
type
description
rationale
output -> mutatedOutput
realism
subtlety
novelty
fixability
```

Severity is not delegated to replay data.

As in M8, severity remains derived from the confirmed contract rule.

The replay generator must therefore reconstruct only the generator-owned score dimensions:

```text
realism
subtlety
novelty
fixability
```

and allow M8 to re-derive severity from the authoritative rule.

---

## 19. Verification Semantics

A verification result compares the baseline replay with the improved-evaluator replay.

Required measurements:

```text
baseline survivors
baseline caught
after survivors
after caught
survivors eliminated
source finding caught after remediation
regressions
```

### Source finding resolved

The source finding is resolved when:

```text
baseline: source attack SURVIVED
after:    source attack CAUGHT
```

If the source attack no longer survives the supplied baseline evaluator, M10 must not pretend it verified a remediation transition. It should return or fail with a clear `source-finding-not-reproducible` state.

### Improvement

```text
improvement =
baseline.survivors.length -
after.survivors.length
```

Positive improvement is useful but is not, by itself, sufficient for success.

### Regression

A regression is any attack that was caught by the baseline evaluator but survives the improved evaluator.

M10 must report these explicitly.

Although a well-formed additive evaluator change should not create such regressions, M10 accepts a whole `improvedEvaluator`, so regression detection is required.

---

## 20. Verification Success Gate

`verificationPassed` is true only when all of the following hold:

1. baseline evaluator passes `expectedOutput`
2. improved evaluator passes `expectedOutput`
3. source attack is reproducibly a baseline survivor
4. source attack is caught by the improved evaluator
5. no baseline-caught replay attack becomes an after survivor

M10 may additionally report survivor reduction, but it must not require every survivor to disappear when the confirmed protection is scoped to one finding/rule.

---

## 21. Verification Output

Minimum normalized result:

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

  sourceFindingReproduced: true,
  sourceFindingCaught: true,
  positiveControlPassed: true,

  improvement: 1,
  eliminatedAttackIds: ["wrong-time"],
  regressionAttackIds: [],

  verificationPassed: true
}
```

Exact nested fields may reuse the normalized M8 result shape where useful, but the public M10 semantics above are locked.

---

## 22. What Verification Proves

A passing M10 verification proves only:

> On this known-good case and this exact replayed set of validated contract-attack candidates, the supplied improved evaluator preserved the positive control, caught the selected source finding, and introduced no replay-set regressions.

It does not prove:

- the protection is universally correct
- the protection covers every future paraphrase
- the production model cannot fail differently
- the production model was attacked
- the natural-language protection statement has been formally proven equivalent to the improved evaluator
- all contract rules are fully enforced
- no unseen evaluator regression exists

M10 must keep this claim narrow in API docs and examples.

---

## 23. Stale and Changed Evaluators

M10 recomputes the baseline using the evaluator supplied at verification time.

It does not trust historical `survived` booleans from an earlier M8 result.

This means a previously reported finding may become non-reproducible if the evaluator has already changed.

That is a valid state.

M10 must report it honestly rather than manufacturing a before/after comparison from stale result metadata.

---

## 24. Provider Independence

M10 adds no direct model-provider dependency.

Only `draftContractProtection()` may invoke an injected AI generator.

`confirmContractProtection()` performs no model call.

`verifyContractProtection()` performs no model call and must use Gotcha-owned deterministic replay data.

Provider adapters remain outside M10 core.

---

## 25. Trust Model

### Untrusted / data-only boundary

The following remain untrusted structured data:

- contract metadata crossing the public API
- input
- expected output
- selected finding data
- protection-generator output
- replay attack data
- confirmed protection objects passed back after serialization/reload

These must be validated/canonicalized before authority is assigned.

### Trusted local callbacks

The following are trusted local integration callbacks:

- original evaluator
- improved evaluator
- injected protection generator as executable caller code

The generator's returned model-produced data is untrusted even though the callback itself is trusted local integration code.

Gotcha is not a JavaScript sandbox.

M10 should reuse the M8 callback/data boundary wherever possible rather than expanding the sandbox claim.

---

## 26. No Direct `runImprovementLoop()` Bridge

M10 V1 must not attach an AI-generated `protectionCheck` to a contract attack merely to satisfy the existing deterministic `runImprovementLoop()` shape.

That would create the wrong authority model.

`runImprovementLoop()` remains appropriate for Mutation Packs whose executable protection callbacks are developer-authored trusted local code.

M10 verification is a separate contract-remediation path that replays contract attacks through M8 with a caller-supplied improved evaluator.

---

## 27. Expected Implementation Shape

The preferred implementation is additive:

```text
src/contract-remediation.js
```

Public exports are added in:

```text
src/index.js
```

Expected dedicated tests:

```text
test/contract-remediation.test.js
```

Expected public/package coverage additions:

```text
test/public-api.test.js
package artifact / external consumer test
```

Expected example after implementation:

```text
examples/contract-remediation.js
```

M10 should not require modifying:

```text
src/engine.js
src/mutation-pack.js
```

If implementation discovers a genuine need to change either file, that is a spec-review event, not an automatic scope expansion.

---

## 28. Required Test Matrix

### Draft validation

- valid proposal
- wrong task rejected
- wrong source attack ID rejected
- wrong rule ID rejected
- unknown rule rejected
- empty statement rejected
- empty rationale rejected
- executable/function data rejected
- Proxy/accessor/custom-runtime data rejected consistently with AI-data policy
- async generator supported only through the established safe native Promise boundary
- malformed/unsafe Promise behavior fails closed

### Human confirmation

- accept
- edit statement
- reject
- duplicate/malformed decision fields fail closed
- rejected draft cannot verify
- edit cannot change rule/source/task authority

### Verification

- baseline source survivor -> after caught = PASS
- improved evaluator rejects known-good output = FAIL
- source finding remains survivor = FAIL
- baseline-caught attack becomes survivor = regression + FAIL
- source finding not reproducible in baseline = explicit non-reproducible state
- unrelated survivors may remain without failing a correctly scoped source remediation
- severity/ranking remains contract-authoritative during replay
- same-rule duplicate semantics remain M8-consistent
- cross-rule identical outputs remain separate

### Runtime/package

- Node 14 minimum-runtime smoke
- Node 22 full suite
- Node 24 full suite
- npm packed external consumer can access the public M10 API
- repository example is deterministic and requires no external API key

---

## 29. M10 Acceptance Gates

M10 is implementation-complete only when all are true:

1. the three public APIs exist and match this authority split
2. AI-generated output remains declarative only
3. human confirmation is mandatory before verification
4. improved evaluator is caller-supplied trusted code
5. verification reuses M8 replay/evaluator boundary rather than duplicating it
6. positive control is preserved
7. source finding must be reproducible before it can count as fixed
8. source finding must be caught after remediation
9. regression attack IDs are reported
10. no `src/engine.js` or `src/mutation-pack.js` change unless this spec is explicitly amended first
11. Node 14/22/24 gates pass
12. packed external-consumer test passes
13. README claims remain narrower than or equal to actual implementation
14. exact-head adversarial review finds no unresolved material M10 contract issue

---

## 30. Not M10

M10 explicitly does not include:

- AI-generated executable JavaScript protections
- automatic source-code patches
- automatically committing evaluator fixes
- automatically modifying the user's repository
- a generic JavaScript sandbox
- provider-specific OpenAI/Anthropic/Google adapters
- hosted model execution
- attacking the user's production AI model
- production observability
- dashboards
- GitHub Actions as a product feature
- collaboration/workspaces
- persistence/database state
- automatic Quality Contract edits
- batch multi-finding remediation
- formal proof that a natural-language protection equals evaluator code
- a universal semantic evaluator
- a protection DSL
- automatic deployment

Those require separate milestones and separate contracts.

---

## 31. Review Stopping Rule

M10 review must remain tied to this documented contract.

A material blocker must demonstrate a reproducible violation such as:

- AI/model-produced executable behavior crossing the data boundary
- human confirmation being bypassed
- contract authority being changed by remediation data
- verification claiming success while the source finding still survives
- known-good output being rejected while success is reported
- a baseline-caught replay attack becoming an after survivor without regression reporting
- stale historical result metadata being trusted instead of replaying the supplied baseline evaluator
- package/public API behavior contradicting the documented M10 contract
- normal supported Node 14/22/24 behavior regression caused by M10

The following are not M10 blockers unless they demonstrate a concrete violation of this contract:

- requests for arbitrary hostile JavaScript sandboxing
- requests for AI-written executable evaluator code
- hosted provider integrations
- production-model attack generation
- dashboards
- automatic patch application
- a future protection DSL
- unrelated engine redesign

---

## 32. Final Locked Architecture Summary

M10 V1 is intentionally conservative:

```text
AI CAN:
propose declarative protection intent

HUMAN CAN:
accept / edit / reject that intent

CALLER CAN:
implement the improved evaluator

GOTCHA CAN:
replay the validated attack set,
protect the known-good control,
measure source-finding closure,
measure survivor reduction,
and detect replay-set regressions
```

The key rule is:

> Gotcha may use AI to suggest what should be protected, but M10 does not turn model output directly into executable evaluator policy.

That preserves the M8 safety boundary while finally giving the contract-driven path a measurable `CATCH THIS → RE-ATTACK` workflow.
