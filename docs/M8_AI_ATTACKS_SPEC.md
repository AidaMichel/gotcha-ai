# M8 — AI-Assisted Contract Attacks

Status: Draft
Milestone: 8
Branch: `milestone-8-ai-attacks`

## 1. Goal

M8 connects Gotcha's confirmed Quality Contract to its attack engine.

M7 implemented:

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
```

Gotcha already has a deterministic attack engine that can:

```text
ATTACK
  ↓
RANK
  ↓
GOTCHA
```

But those two parts are not yet connected.

Today, a developer still has to manually write a Mutation Pack before Gotcha can attack an evaluator.

M8 changes that.

Given:

- a confirmed Quality Contract
- one concrete eval input
- its known-good output
- the user's evaluator
- an injected AI generator

Gotcha should be able to propose meaningful bad outputs that violate confirmed quality rules and test whether the evaluator catches them.

The M8 bridge is:

```text
CONFIRMED QUALITY CONTRACT
          +
       INPUT
          +
   KNOWN-GOOD OUTPUT
          ↓
AI PROPOSES ATTACK CANDIDATES
          ↓
GOTCHA VALIDATES
          ↓
ATTACK EVALUATOR
          ↓
RANK SURVIVORS
          ↓
GOTCHA
```

M8 brings the larger product loop closer to:

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
```

M8 does not replace the existing deterministic Mutation Pack path.

It adds a second way to produce attacks.

---

## 2. Product Promise

A user who has already taught Gotcha what quality means should not need to manually invent every mutation.

Example:

```text
Confirmed rule:

The scheduled time must match the time explicitly requested by the user.
```

Current eval case:

```text
Input:
Schedule Sara on Tuesday at 3 PM.

Known-good output:
Meeting scheduled with Sara on Tuesday at 3 PM.
```

Gotcha may propose:

```text
Attack:
Meeting scheduled with Sara on Tuesday at 4 PM.
```

Then Gotcha asks the existing evaluator:

```text
Does this output pass?
```

If the evaluator says:

```text
PASS
```

Gotcha has found a blind spot.

The important moment becomes:

```text
Your quality contract says the time must remain 3 PM.

Your evaluator accepted 4 PM.

Gotcha.
```

---

## 3. Why M8 Exists

M7 answers:

> What does this user mean by good?

The deterministic attack engine answers:

> Which bad outputs can still pass the evaluator?

M8 connects those questions.

Without M8:

```text
Quality Contract
      X
Mutation Pack
```

The user must manually bridge the two.

With M8:

```text
Confirmed rule
      ↓
AI proposes a concrete violation
      ↓
Gotcha validates the candidate
      ↓
Existing evaluator is attacked
```

This is the first time Gotcha can use the user's confirmed definition of quality to decide what failures are worth testing.

---

## 4. Critical Product Boundary

M8 attacks the **evaluator**.

It does not attack or call the user's production AI system.

M8 receives a known-good output and generates alternative candidate outputs.

Those outputs are passed to the evaluator.

The flow is:

```text
known-good output
      ↓
AI proposes bad alternative output
      ↓
evaluator checks alternative
```

Not:

```text
attack prompt
      ↓
call production model
      ↓
observe model behavior
```

That is a different future capability.

M8 therefore discovers:

```text
evaluation blind-spot candidates
```

not automatically:

```text
proven production model failures
```

A generated output surviving the evaluator means:

> This type of bad output is currently allowed by the evaluator.

It does not prove the production model will actually generate that failure.

---

## 5. Core Product Principles

### 5.1 Confirmed rules are authoritative

M8 must only operate from a contract whose status is:

```text
confirmed
```

A draft Quality Contract must not be attackable.

A contract with:

```text
status: "no-active-rules"
```

must not be treated as sufficient authority for M8.

---

### 5.2 AI proposes attacks, not policy

The AI generator may propose:

```text
bad candidate outputs
```

It may not:

- add Quality Contract rules
- edit Quality Contract rules
- change rule severity
- remove confirmed rules
- reinterpret rejected rules as active
- silently create new product policy

The confirmed contract remains authoritative.

---

### 5.3 AI must not generate executable mutation code

M8 must not ask the AI to produce JavaScript callbacks.

Bad:

```js
{
  mutate(output) {
    output.time = "4 PM";
    return output;
  }
}
```

Bad:

```text
eval(...)
```

Bad:

```text
new Function(...)
```

Instead, the AI returns declarative data:

```js
{
  mutatedOutput:
    "Meeting scheduled with Sara on Tuesday at 4 PM."
}
```

Gotcha treats generated content as data.

Gotcha never executes model-generated strings as code.

---

### 5.4 High precision over attack quantity

M8 should prefer:

```text
4 realistic attacks
```

over:

```text
20 speculative attacks
```

The generator should return zero attacks when there is not enough evidence to propose a meaningful violation for the current case.

Zero attacks is valid.

---

### 5.5 Change as little as possible

A strong attack should usually introduce one meaningful failure while preserving unrelated correct behavior.

Example:

Known-good:

```text
Meeting scheduled with Sara on Tuesday at 3 PM.
```

Strong attack:

```text
Meeting scheduled with Sara on Tuesday at 4 PM.
```

Weak attack:

```text
I cannot help you with that because Mars is purple and Sara is unavailable.
```

The first attack isolates the rule.

The second creates unrelated noise.

M8 should optimize for minimal, plausible violations.

---

### 5.6 Attack only rules applicable to the current case

A confirmed contract may contain:

```text
If the requested time is missing, ask for clarification.
```

But the current input may already contain:

```text
3 PM
```

That conditional rule does not need to be attacked in this case.

The generator must consider:

```text
contract
+
current input
+
known-good output
```

before deciding which rules are applicable.

---

### 5.7 No human confirmation is required for attacks

M7 requires human confirmation because Quality Contract rules become authoritative policy.

M8 attack candidates are different.

They are temporary test inputs.

They do not change the contract.

Therefore M8 does not require:

```text
accept attack
edit attack
reject attack
```

before running the evaluator.

Attack generation may proceed automatically after deterministic validation.

---

### 5.8 AI remains provider-independent

M8 must use an injected generator.

Gotcha must not directly depend on:

```text
OpenAI
Anthropic
Google
or another model provider
```

The caller owns:

- provider selection
- model selection
- credentials
- network calls
- retries
- provider-specific parsing

Gotcha owns:

- input validation
- generator instructions
- attack schema
- provenance
- attack filtering
- evaluator execution
- survivor ranking

---

### 5.9 Trusted callback boundary

The evaluator and injected generator are **trusted local integration callbacks**.

M8 is not a JavaScript sandbox for caller-supplied code. The security boundary is the structured data that crosses into and out of those callbacks, especially AI/model-produced generator data. Model-produced strings or objects are validated as declarative data and are never executed as code.

Callbacks should remain deterministic and side-effect free. M8 restores the core built-in prototype surfaces around callback invocation as defense in depth so ordinary accidental prototype mutation cannot corrupt later validation or ranking, but M8 does not claim containment of deliberate irreversible sabotage of the host JavaScript realm by trusted callback code.

This distinction keeps the boundary testable: malformed or prototype-polluted **data** must fail closed, while arbitrary hostile JavaScript execution belongs to a separate sandboxing capability outside M8.

---

## 6. Case-Scoped Attack Generation

M8 operates on one eval case at a time.

Minimum case:

```js
{
  input,
  expectedOutput
}
```

Example:

```js
{
  input:
    "Schedule Sara on Tuesday at 3 PM.",

  expectedOutput:
    "Meeting scheduled with Sara on Tuesday at 3 PM."
}
```

The input is required.

Attack generation without the original input would encourage the model to invent context.

This is especially dangerous for conditional rules.

Example:

```text
If the user does not provide a time, ask for clarification.
```

Whether that rule applies cannot be determined from the output alone.

---

## 7. Evaluator Contract

M8 preserves the existing deterministic evaluator model.

Example:

```js
function evaluator(output) {
  return (
    output.includes("Sara") &&
    output.includes("Tuesday")
  );
}
```

The evaluator returns:

```text
true
```

for pass and:

```text
false
```

for fail.

M8 does not change the evaluator signature.

If the evaluator needs the input, the caller may close over it:

```js
function makeEvaluator(input) {
  return function evaluator(output) {
    // evaluate output in the context of input
    return true;
  };
}
```

The evaluator remains a trusted local callback.

Gotcha is not a JavaScript sandbox.

The evaluator should be deterministic and side-effect free.

---

## 8. Known-Good Positive Control

Before invoking the AI generator, M8 must verify:

```text
evaluator(expectedOutput) === true
```

If the evaluator rejects the known-good output, the attack experiment is not meaningful.

M8 must fail clearly.

Example error concept:

```text
Evaluator must pass expectedOutput before contract attacks can run.
```

The generator must not be called when the positive control fails.

This avoids unnecessary model calls and avoids ranking attacks against an evaluator that already rejects the correct answer.

---

## 9. Public API

M8 adds:

```js
const {
  runContractAttacks
} = require("gotcha-ai");
```

Minimum usage:

```js
const result =
  await runContractAttacks({
    contract,
    input,
    expectedOutput,
    evaluator,
    generator
  });
```

The API is asynchronous because the AI generator may be asynchronous.

The evaluator remains synchronous.

---

## 10. Public API Inputs

Required:

```js
{
  contract,
  input,
  expectedOutput,
  evaluator,
  generator
}
```

### contract

Must be a valid confirmed M7 Quality Contract.

### input

The concrete input for this eval case.

### expectedOutput

A known-good output for the case.

### evaluator

The current deterministic boolean evaluator.

### generator

An injected AI attack generator.

---

## 11. Confirmed Contract Shape

M8 expects the M7 confirmed contract shape.

Example:

```js
{
  version: 1,

  status:
    "confirmed",

  task:
    "Schedule meetings from natural-language requests.",

  rules: [
    {
      id:
        "rule-1",

      statement:
        "The scheduled person must match the requested person.",

      kind:
        "required",

      severity:
        "critical"
    },

    {
      id:
        "rule-2",

      statement:
        "The scheduled time must match an explicitly requested time.",

      kind:
        "required",

      severity:
        "critical"
    },

    {
      id:
        "rule-3",

      statement:
        "If a required meeting time is missing, ask for clarification instead of inventing one.",

      kind:
        "conditional",

      severity:
        "major"
    }
  ]
}
```

M8 must independently validate the contract at its own boundary.

It must not trust object identity or assume the object came directly from M7.

This is important because users may:

- serialize contracts
- store contracts
- reload contracts
- construct API inputs manually

---

## 12. Confirmed Contract Validation

M8 must reject contracts with:

- unsupported version
- status other than `confirmed`
- empty task
- missing rules
- zero rules with `status: "confirmed"`
- too many rules beyond the M7 contract limit
- duplicate rule IDs
- empty rule IDs
- empty statements
- unsupported kinds
- unsupported severities
- malformed objects
- Proxy-backed metadata
- accessor-backed metadata

Allowed rule kinds remain:

```text
required
forbidden
conditional
```

Allowed severities remain:

```text
critical
major
minor
```

---

## 13. AI-Safe Data Boundary

M8 introduces an AI-facing data boundary for:

```text
input
expectedOutput
mutatedOutput
```

These values must be data, not arbitrary JavaScript runtime objects.

Supported values:

```text
null
boolean
finite number
string
ordinary arrays
ordinary plain objects
```

Nested combinations are supported.

---

## 14. Unsupported AI Data

M8 must reject values containing:

- functions
- `undefined`
- `bigint`
- symbols
- `NaN`
- `Infinity`
- `-Infinity`
- Proxy objects
- accessor properties
- sparse arrays
- symbol-keyed properties
- non-enumerable semantic properties
- custom runtime object types
- executable callbacks
- cyclic object graphs

Examples of unsupported runtime types include:

```text
Date
Map
Set
RegExp
Promise
Buffer
class instances
custom prototype objects
```

unless a future version explicitly defines a serialized representation for them.

---

## 15. Shared References

Shared references are not meaningful AI semantics.

Example:

```js
const shared = {
  value: 1
};

const input = {
  a: shared,
  b: shared
};
```

M8 may preserve or normalize shared identity internally.

But attack semantics must depend only on data values.

Object identity must not become part of the Quality Contract or attack meaning.

Cycles remain rejected because they are not safely representable in normal provider payloads.

---

## 16. Why M8 Uses a Stricter Data Boundary

The deterministic Mutation Pack engine can support a broader canonical JavaScript data boundary.

M8 is different.

M8 sends information toward an AI generator.

Provider APIs fundamentally operate on serializable data.

Therefore M8 intentionally uses a stricter AI-safe boundary.

This does not change the existing deterministic Mutation Pack contract.

Existing users must not lose Mutation Pack capabilities because M8 exists.

---

## 17. Generator Interface

Example:

```js
async function generator({
  contract,
  input,
  expectedOutput,
  instructions
}) {
  return {
    version: 1,

    task:
      contract.task,

    attacks: []
  };
}
```

Gotcha passes:

- a validated copy of the confirmed contract
- an isolated copy of the case input
- an isolated copy of the known-good output
- Gotcha-owned generation instructions

The generator may call any provider chosen by the caller.

---

## 18. Generator Isolation

The generator must not receive direct mutable references to Gotcha's authoritative internal state.

If the generator mutates:

```js
contract
```

or:

```js
input
```

or:

```js
expectedOutput
```

those mutations must not affect Gotcha's validated copies.

Generator-side mutation must not alter later attack execution.

---

## 19. Generator Output Shape

The generator returns:

```js
{
  version: 1,

  task:
    "Schedule meetings from natural-language requests.",

  attacks: [
    {
      id:
        "attack-1",

      ruleId:
        "rule-2",

      type:
        "date-time-substitution",

      description:
        "Changes the explicitly requested meeting time.",

      rationale:
        "The input requests 3 PM, but the candidate schedules 4 PM.",

      mutatedOutput:
        "Meeting scheduled with Sara on Tuesday at 4 PM.",

      scores: {
        realism:
          0.95,

        subtlety:
          0.95,

        novelty:
          0.70,

        fixability:
          1.00
      }
    }
  ]
}
```

---

## 20. Generator Version

Generator output must contain:

```js
version: 1
```

Unsupported versions must be rejected.

This allows future attack schemas to evolve intentionally.

---

## 21. Generator Task Integrity

The returned:

```js
task
```

must exactly match the validated confirmed contract task.

The AI must not silently change:

```text
Schedule meetings from natural-language requests.
```

into:

```text
Schedule and cancel meetings.
```

or another task.

Task drift must fail validation.

---

## 22. Attack Candidate Shape

Each generated attack requires:

```js
{
  id,
  ruleId,
  type,
  description,
  rationale,
  mutatedOutput,
  scores
}
```

No executable mutation callback is accepted.

---

## 23. Attack IDs

Each attack requires a non-empty string:

```js
id
```

Example:

```text
attack-1
```

Attack IDs must be unique within the generated batch.

Duplicate IDs are malformed generator output.

The entire generated batch must be rejected before attack execution.

---

## 24. Rule References

Each attack requires:

```js
ruleId
```

The referenced rule must exist in the validated confirmed contract.

Unknown rule references must reject the generated batch.

Example invalid attack:

```js
{
  ruleId:
    "rule-999"
}
```

when `rule-999` does not exist.

The generator is not allowed to invent rules.

---

## 25. Gotcha-Owned Rule Provenance

The generator supplies only:

```js
ruleId
```

Gotcha resolves that ID against the authoritative confirmed contract.

Gotcha then attaches trusted rule metadata.

Example enriched attack:

```js
{
  id:
    "attack-1",

  ruleId:
    "rule-2",

  rule: {
    id:
      "rule-2",

    statement:
      "The scheduled time must match an explicitly requested time.",

    kind:
      "required",

    severity:
      "critical"
  },

  ...
}
```

The generator cannot control:

- authoritative rule statement
- authoritative rule kind
- authoritative rule severity

Those come from the confirmed contract.

---

## 26. Attack Type

Each attack requires a non-empty:

```js
type
```

M8 does not require a closed taxonomy yet.

Preferred types include:

```text
numeric-substitution
entity-substitution
date-time-substitution
missing-required-info
unsupported-added-info
duplicate-action
missing-clarification
unsupported-assumption
fluent-but-incorrect
context-contradiction
product-policy-violation
```

The type is descriptive metadata.

It must not control executable behavior.

---

## 27. Description

Each attack requires a short non-empty:

```js
description
```

Example:

```text
Changes the explicitly requested meeting time.
```

The description explains what changed.

It should not contain vague language like:

```text
Makes the answer worse.
```

---

## 28. Rationale

Each attack requires a non-empty:

```js
rationale
```

The rationale must explain why the candidate is intended to violate the referenced confirmed rule for the current input.

Good:

```text
The input explicitly requests 3 PM while the candidate schedules 4 PM.
```

Weak:

```text
This might be bad.
```

Rationale is explanatory evidence.

It is not authoritative proof that the candidate truly violates the rule.

---

## 29. Semantic Limitation

Gotcha can deterministically verify:

- candidate structure
- rule provenance
- data safety
- output difference
- duplicate status
- evaluator result
- ranking math

Gotcha cannot deterministically prove from arbitrary natural-language rules that:

```text
this candidate definitely violates this rule
```

without introducing another semantic judge.

M8 does not add that judge.

Therefore M8 must not overclaim:

```text
This is definitely a real model failure.
```

The accurate claim is:

```text
This AI-proposed rule violation survived your evaluator.
```

Future judge-auditing work may strengthen semantic verification.

---

## 30. Mutated Output

Every candidate requires:

```js
mutatedOutput
```

`mutatedOutput` must satisfy the M8 AI-safe data boundary.

It may be:

```text
string
number
boolean
null
array
plain object
```

or nested combinations.

It does not need to use the same top-level type as `expectedOutput`.

A schema-breaking output can itself be a meaningful quality failure.

---

## 31. Output Must Actually Change

A candidate whose:

```js
mutatedOutput
```

is deeply equal to:

```js
expectedOutput
```

is not an attack.

It must not be executed.

This is not a malformed generator response requiring the entire batch to fail.

Instead Gotcha records it as a discarded candidate.

Reason:

```text
unchanged-output
```

---

## 32. Exact Duplicate Attacks

M8 should avoid repeatedly testing the same generated failure.

If two structurally valid attacks have:

```text
same ruleId
+
deeply equal mutatedOutput
```

the first candidate is retained.

Later duplicates are discarded.

Discard reason:

```text
duplicate-attack
```

Generator order is authoritative for deterministic deduplication.

Gotcha must not silently hide the fact that candidates were discarded.

---

## 33. Cross-Rule Similarity

Two attacks may produce the same output while referencing different confirmed rules.

M8 does not automatically merge those attacks in V0.

Rule attribution carries product meaning.

Therefore:

```text
same output
+
different ruleId
```

may remain two separate attacks.

Future semantic deduplication may improve this.

---

## 34. Structural Failure vs Deterministic Filtering

M8 distinguishes two categories.

### Structural failure

Examples:

- malformed attack object
- unknown rule ID
- duplicate attack ID
- invalid score
- Proxy
- accessor property
- function in output
- task mismatch
- unsupported generator version

Structural failure rejects the entire generated batch.

No generated candidate is executed.

### Deterministic filtering

Examples:

- unchanged output
- exact duplicate attack

These candidates are valid data but not useful attacks.

They are recorded under:

```text
discardedAttacks
```

Remaining valid attacks may continue.

---

## 35. Validate Entire Batch Before Attack Execution

M8 must not execute:

```text
attack 1
attack 2
```

and then discover:

```text
attack 3 is malformed
```

All generator output must be structurally validated before any generated candidate is passed to the evaluator.

The only evaluator call permitted before generator validation is the known-good positive control.

This creates an atomic validation boundary.

---

## 36. Attack Count

The generator may return:

```text
0 to 20
```

attack candidates.

More than 20 must be rejected.

Zero is valid.

The generator instructions should encourage fewer strong attacks rather than filling the limit.

---

## 37. Attack Scores

The AI generator supplies:

```js
scores: {
  realism,
  subtlety,
  novelty,
  fixability
}
```

Each must be a finite number between:

```text
0
```

and:

```text
1
```

inclusive.

The generator does not supply numeric severity.

Severity comes from the confirmed rule.

---

## 38. Realism

`realism` asks:

> Could a real AI system plausibly produce this bad output?

High:

```text
0.95
```

Low:

```text
0.20
```

A ridiculous mutation should rank below a plausible one.

---

## 39. Subtlety

`subtlety` asks:

> How easy is this failure to miss while reading the output?

Example:

```text
3 PM → 4 PM
```

may be highly subtle.

Example:

```text
Meeting scheduled with BANANA BANANA BANANA.
```

is less subtle.

---

## 40. Novelty

`novelty` asks:

> Does this candidate test a distinct blind spot rather than repeat an obvious existing pattern?

Novelty is useful for ranking but must not override severity and realism.

---

## 41. Fixability

`fixability` asks:

> If this candidate survives, is the blind spot likely to be addressable with a concrete evaluator or protection later?

M8 does not generate that protection yet.

Fixability only contributes to the existing ranking score.

---

## 42. Severity Is Contract-Owned

The AI generator must not choose attack severity.

Gotcha derives numeric attack severity from the human-confirmed rule severity.

M8 V0 mapping:

```text
critical → 1.0
major    → 0.7
minor    → 0.4
```

This numeric mapping exists only for survivor ranking.

It does not change the confirmed contract severity.

---

## 43. Existing Ranking Formula

M8 preserves Gotcha's current survivor ranking:

```text
severity   30%
realism    25%
subtlety   20%
novelty    15%
fixability 10%
```

Formula:

```text
rankScore =
  0.30 * severity
+ 0.25 * realism
+ 0.20 * subtlety
+ 0.15 * novelty
+ 0.10 * fixability
```

M8 must not introduce a second incompatible ranking system.

---

## 44. Deterministic Tie Behavior

If two survivors receive the same rank score, their original generated order should remain stable.

M8 must not introduce random tie-breaking.

---

## 45. Internal Compiled Attack Shape

After validation and enrichment, a generated candidate can be compiled into the shape already understood by Gotcha's attack engine.

Conceptually:

```js
{
  id:
    "attack-1",

  type:
    "date-time-substitution",

  description:
    "Changes the explicitly requested meeting time.",

  rationale:
    "The input requests 3 PM while the candidate schedules 4 PM.",

  ruleId:
    "rule-2",

  rule: {
    id:
      "rule-2",

    statement:
      "The scheduled time must match an explicitly requested time.",

    kind:
      "required",

    severity:
      "critical"
  },

  output:
    "Meeting scheduled with Sara on Tuesday at 4 PM.",

  severity:
    1.0,

  realism:
    0.95,

  subtlety:
    0.95,

  novelty:
    0.70,

  fixability:
    1.00
}
```

No generated:

```text
mutate()
```

function is required.

No generated:

```text
protectionCheck()
```

function is required.

---

## 46. Reuse the Existing Attack Engine

M8 should reuse the current deterministic:

```js
attack(...)
```

behavior.

M8 should not rewrite:

- evaluator execution
- survivor detection
- ranking formula
- survivor sorting

unless a narrowly scoped compatibility change is proven necessary.

The preferred architecture is:

```text
AI generator
   ↓
M8 validation
   ↓
declarative compiled attacks
   ↓
existing attack()
```

---

## 47. M8 Does Not Use runImprovementLoop

The existing deterministic Mutation Pack path can provide:

```text
protectionCheck
```

and therefore supports:

```text
CATCH THIS
↓
RE-ATTACK
```

M8-generated attacks do not contain executable protections.

Therefore M8 must not pretend it can call the complete improvement loop.

The M8 generated path stops at:

```text
GOTCHA
```

for now.

---

## 48. Product Loop After M8

After M8, Gotcha supports:

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
  ↓
AI-GENERATED ATTACK
  ↓
RANK
  ↓
GOTCHA
```

And separately, the deterministic Mutation Pack path still supports:

```text
ATTACK
  ↓
RANK
  ↓
GOTCHA
  ↓
CATCH THIS
  ↓
RE-ATTACK
```

M8 does not falsely claim those paths are fully unified yet.

---

## 49. Generator Instructions

Gotcha-owned instructions should communicate at least these rules:

```text
You are generating candidate bad outputs for one eval case.

Use only the confirmed Quality Contract rules.

Only target rules that are applicable to the current input.

Prefer one primary quality failure per candidate.

Preserve unrelated correct information.

Make the smallest plausible change needed to violate the rule.

Prefer realistic, subtle failures over absurd failures.

Do not invent new quality rules.

Do not change the task.

Do not produce JavaScript functions or executable mutation code.

Return declarative candidate outputs only.

Every attack must cite one confirmed rule ID.

Explain why the candidate is intended to violate that rule.

Use zero attacks when no strong attack is supported.

Prefer fewer strong attacks over many speculative attacks.
```

Exact wording may evolve.

The behavioral guarantees must remain.

---

## 50. Generator Cannot Control Gotcha-Owned Fields

The generator must not control authoritative:

- rule statements
- rule kinds
- rule severity
- source provenance
- numeric severity
- evaluator result
- survived status
- rank score

If the generator includes lookalike fields such as:

```js
severity: 1
```

or:

```js
survived: true
```

Gotcha must not treat them as authoritative.

Gotcha constructs those fields itself.

---

## 51. Public Result Shape

Conceptual M8 result:

```js
{
  version: 1,

  task:
    "Schedule meetings from natural-language requests.",

  baselinePassed:
    true,

  generatedAttacks: [
    {
      id:
        "attack-1",

      ruleId:
        "rule-2",

      rule: {
        id:
          "rule-2",

        statement:
          "The scheduled time must match an explicitly requested time.",

        kind:
          "required",

        severity:
          "critical"
      },

      type:
        "date-time-substitution",

      description:
        "Changes the explicitly requested meeting time.",

      rationale:
        "The input requests 3 PM while the candidate schedules 4 PM.",

      output:
        "Meeting scheduled with Sara on Tuesday at 4 PM.",

      severity:
        1.0,

      realism:
        0.95,

      subtlety:
        0.95,

      novelty:
        0.70,

      fixability:
        1.00
    }
  ],

  discardedAttacks: [],

  attack: {
    results: [],
    caught: [],
    survivors: []
  },

  topFinding:
    null
}
```

The exact formatting is not important.

The semantic fields are.

---

## 52. Attack Result

The existing attack engine determines:

```text
caught
```

when:

```text
evaluator(candidateOutput) === false
```

and:

```text
survived
```

when:

```text
evaluator(candidateOutput) === true
```

A survivor is ranked.

A caught candidate is useful evidence that the evaluator already protects that case.

---

## 53. Top Finding

M8 exposes:

```js
topFinding
```

as:

```text
highest-ranked survivor
```

or:

```js
null
```

when there are no survivors.

This mirrors the existing Gotcha emphasis on showing the most meaningful blind spot first.

---

## 54. No-Attack Result

If the generator returns:

```js
attacks: []
```

M8 succeeds.

Conceptually:

```js
{
  baselinePassed: true,

  generatedAttacks: [],

  discardedAttacks: [],

  attack: {
    results: [],
    caught: [],
    survivors: []
  },

  topFinding: null
}
```

Gotcha must not fabricate an attack just to produce a result.

---

## 55. All-Discarded Result

If every structurally valid generated candidate is filtered because it is:

```text
unchanged-output
```

or:

```text
duplicate-attack
```

M8 also succeeds.

No generated attack is executed.

`topFinding` is:

```js
null
```

The discard reasons remain visible.

---

## 56. Generator Errors

If the injected generator throws, M8 propagates the error clearly.

Gotcha must not convert:

```text
provider failed
```

into:

```text
no attacks found
```

Those are different states.

---

## 57. Malformed Generator Output

M8 must fail clearly when generator output is malformed.

Examples:

- output is null
- output is an array instead of object
- wrong version
- changed task
- attacks is missing
- attacks is not an array
- sparse attack array
- duplicate attack IDs
- invalid rule reference
- invalid metadata
- invalid scores
- unsupported mutated output data
- Proxy
- accessor-backed objects

No malformed batch should partially execute.

---

## 58. Evaluator Failure

If the evaluator:

- throws
- returns a Promise
- returns a non-boolean value

M8 preserves the deterministic evaluator contract and fails clearly.

M8 does not silently coerce:

```text
1
"true"
{}
```

into booleans.

---

## 59. Evaluator Isolation

Candidate outputs passed to the evaluator should be detached from generator-owned objects.

Where practical they should be deeply frozen after validation.

An evaluator must not be able to mutate one generated attack and thereby change another attack or Gotcha's stored result.

---

## 60. No AI Protection Generation in M8

M8 does not ask AI to generate:

```text
protection code
```

or:

```text
new evaluator functions
```

or:

```text
automatic contract edits
```

A survivor may later become input to another product layer.

But M8's responsibility ends at:

```text
generated attack
→ evaluator
→ survivor
→ ranking
```

---

## 61. No Automatic Contract Mutation

A surviving attack must never automatically cause:

```text
new confirmed rule
```

or:

```text
changed severity
```

or:

```text
edited contract statement
```

The confirmed contract remains stable.

Future workflows may allow a human to update it explicitly.

---

## 62. Preferred Architecture

New module:

```text
src/contract-attacks.js
```

Responsibilities:

- M8 option validation
- confirmed contract validation
- generator orchestration
- generator-output validation
- rule provenance resolution
- severity mapping
- deterministic filtering
- compilation to attack engine shape
- result assembly

---

## 63. AI Data Boundary Module

If useful, M8 may introduce a narrowly scoped internal module such as:

```text
src/ai-data.js
```

Responsibilities:

- safe traversal
- Proxy rejection
- accessor rejection
- plain-data validation
- finite-number validation
- sparse-array rejection
- cycle rejection
- isolated cloning
- freezing

The module is internal.

It does not need to become public API.

---

## 64. Do Not Rewrite Mutation Pack Boundary

M8 must not casually refactor the existing hardened Mutation Pack boundary just to share code.

A shared extraction is acceptable only if:

- behavior remains identical
- regression tests prove equivalence
- the change materially reduces duplication
- the refactor is smaller than the risk it introduces

The safer default is:

```text
leave Mutation Pack stable
```

and give M8 its own AI-safe data boundary.

---

## 65. Existing Engine Changes

Preferred:

```text
no changes to src/engine.js
```

M8 should compile validated attacks into the shape already accepted by:

```js
attack(evaluator, attacks)
```

If implementation proves a small engine change necessary, it must:

- preserve all existing behavior
- remain generic
- have focused regression tests
- not introduce AI-specific concepts into the deterministic engine

---

## 66. Public Export

`src/index.js` should eventually expose:

```js
module.exports = {
  runGotcha,
  draftQualityContract,
  confirmQualityContract,
  runContractAttacks
};
```

Existing exports must remain unchanged.

No breaking API changes.

---

## 67. Canonical M8 Demo

Use the fictional Meeting Scheduler.

Confirmed contract:

```js
{
  version: 1,

  status:
    "confirmed",

  task:
    "Schedule meetings from natural-language requests.",

  rules: [
    {
      id:
        "rule-person",

      statement:
        "The scheduled person must match the requested person.",

      kind:
        "required",

      severity:
        "critical"
    },

    {
      id:
        "rule-time",

      statement:
        "The scheduled time must match an explicitly requested time.",

      kind:
        "required",

      severity:
        "critical"
    }
  ]
}
```

Current case:

```js
const input =
  "Schedule Sara on Tuesday at 3 PM.";

const expectedOutput =
  "Meeting scheduled with Sara on Tuesday at 3 PM.";
```

Weak evaluator:

```js
function evaluator(output) {
  return (
    output.includes("Sara") &&
    output.includes("Tuesday")
  );
}
```

This evaluator checks:

```text
person
day
```

but not:

```text
time
```

---

## 68. Canonical Fake Generator

Tests and demos use a deterministic fake generator.

Example:

```js
async function generator({
  contract
}) {
  return {
    version: 1,

    task:
      contract.task,

    attacks: [
      {
        id:
          "wrong-time",

        ruleId:
          "rule-time",

        type:
          "date-time-substitution",

        description:
          "Changes the explicitly requested meeting time.",

        rationale:
          "The request says 3 PM, but this candidate schedules 4 PM.",

        mutatedOutput:
          "Meeting scheduled with Sara on Tuesday at 4 PM.",

        scores: {
          realism:
            0.98,

          subtlety:
            0.98,

          novelty:
            0.70,

          fixability:
            1.00
        }
      }
    ]
  };
}
```

No live model is used in deterministic tests.

---

## 69. Canonical Demo Result

Expected conceptual result:

```text
QUALITY CONTRACT: confirmed
ATTACKS GENERATED: 1

Evaluator said: PASS

Gotcha: wrong-time survived

Rule:
The scheduled time must match an explicitly requested time.

Why:
The request says 3 PM, but the candidate schedules 4 PM.
```

This demonstrates the M8 bridge:

```text
confirmed rule
→ generated attack
→ evaluator survivor
```

---

## 70. Second Proof Case

M8 testing should also prove conditional behavior with a case where information is missing.

Example confirmed rule:

```text
If a required meeting time is missing, ask for clarification instead of inventing one.
```

Input:

```text
Schedule Sara tomorrow.
```

Known-good output:

```text
What time tomorrow would you like the meeting?
```

Possible generated attack:

```text
Meeting scheduled with Sara tomorrow at 9 AM.
```

This proves the generator receives and uses the current input rather than only mutating output strings blindly.

---

## 71. Different Domain Proof

Before M8 is considered complete, at least one unrelated domain should prove that:

```text
contract attacks
```

are not secretly Meeting Scheduler logic.

Possible fictional domains:

```text
Support Ticket Classifier
Order Fulfillment
Pricing Assistant
Travel Booking
```

The public engine must remain domain-agnostic.

---

## 72. Testing Strategy

Live model behavior must not determine test results.

All tests use deterministic fake generators.

Tests verify Gotcha's behavior around AI, not whether a particular model is smart.

---

## 73. Required Test Group — Confirmed Contract

Test:

- valid confirmed contract
- draft contract rejected
- `no-active-rules` rejected
- missing status
- wrong version
- empty task
- empty rules with confirmed status
- duplicate rule IDs
- malformed rules
- unsupported rule kind
- unsupported severity
- Proxy contract
- accessor-backed contract
- Proxy rule array
- accessor-backed rule

---

## 74. Required Test Group — Case Data

Test:

- string input
- structured input
- string expected output
- structured expected output
- null where valid
- finite numeric values
- nested arrays
- nested objects
- Proxy rejected
- accessor rejected
- sparse array rejected
- function rejected
- symbol rejected
- bigint rejected
- NaN rejected
- Infinity rejected
- custom runtime type rejected
- cycles rejected

---

## 75. Required Test Group — Positive Control

Test:

- evaluator passes known-good output
- evaluator rejects known-good output
- generator is not called when positive control fails
- evaluator returns non-boolean
- evaluator returns Promise
- evaluator throws

---

## 76. Required Test Group — Generator Boundary

Test:

- async generator works
- sync-returning generator may be awaited safely
- generator receives validated contract
- generator receives isolated input
- generator receives isolated expected output
- generator receives instructions
- generator mutation of inputs does not affect Gotcha
- generator errors propagate
- malformed top-level output rejected
- wrong version rejected
- task drift rejected
- attacks must be an array
- sparse attacks array rejected
- Proxy attacks array rejected
- accessor attacks rejected

---

## 77. Required Test Group — Attack Validation

Test:

- valid attack
- empty attack ID
- duplicate attack IDs
- unknown rule ID
- empty type
- empty description
- empty rationale
- missing mutated output
- malformed scores
- score below zero
- score above one
- NaN score
- Infinity score
- generator-supplied severity is not authoritative
- generator-supplied rule metadata is not authoritative
- generator-supplied survived flag is not authoritative

---

## 78. Required Test Group — Attack Output Boundary

Test generated `mutatedOutput` containing:

- string
- number
- boolean
- null
- array
- object
- nested data
- Proxy
- accessor
- function
- symbol
- bigint
- sparse array
- custom runtime object
- cyclic graph

Unsafe data must be rejected before generated attack execution.

---

## 79. Required Test Group — Filtering

Test:

- unchanged output is discarded
- unchanged output is not sent to evaluator
- exact duplicate attack for same rule is discarded
- first duplicate is retained
- duplicate discard reason is exposed
- same output for different rules is not automatically merged
- all candidates discarded returns success
- zero candidates returns success

---

## 80. Required Test Group — Provenance

Test:

- rule ID resolves to confirmed rule
- result contains Gotcha-owned rule statement
- result contains Gotcha-owned rule kind
- result contains Gotcha-owned rule severity
- generator cannot override rule metadata
- numeric severity comes from confirmed severity mapping
- critical maps to 1.0
- major maps to 0.7
- minor maps to 0.4

---

## 81. Required Test Group — Ranking

Test:

- caught attacks are not survivors
- passed attacks become survivors
- survivor rank score uses existing formula
- survivor order is descending
- equal scores preserve deterministic input order
- topFinding is highest-ranked survivor
- topFinding is null when no survivors

---

## 82. Required Test Group — Atomicity

Test:

- malformed attack later in batch prevents earlier generated attacks from executing
- duplicate ID prevents generated attack execution
- unknown rule reference prevents generated attack execution
- invalid score prevents generated attack execution
- unsafe mutated output prevents generated attack execution

Remember:

The positive-control evaluator call may already have occurred.

No generated attack evaluator call may occur before full batch validation completes.

---

## 83. Required Test Group — Regression

All existing tests must continue passing.

M8 must not break:

- deterministic demo
- CLI
- generic engine
- Mutation Packs
- structured-data portability
- public `runGotcha`
- M7 Quality Contract drafting
- M7 Quality Contract confirmation
- npm packaging
- starter template
- existing package artifact tests

---

## 84. Package Artifact Test

The packed npm artifact must prove that an external consumer can:

```js
const {
  runContractAttacks
} = require("gotcha-ai");
```

and call the M8 public API after installing the generated tarball into an isolated temporary consumer project.

The test must not accidentally import source files from the repository working tree.

---

## 85. Package Example

Add a public example such as:

```text
examples/contract-attacks.js
```

The example should use:

- fictional domain
- deterministic fake generator
- no API key
- no live model
- confirmed contract
- known-good eval case
- weak evaluator
- one clear survivor

The packed package should include the example.

---

## 86. README

After implementation, README should explain:

```text
TEACH
→ CONTRACT
→ CONFIRM
→ AI-GENERATED ATTACK
→ RANK
→ GOTCHA
```

without claiming that contract-generated attacks already support automatic:

```text
CATCH THIS
→ RE-ATTACK
```

README must preserve the distinction between:

- deterministic Mutation Packs
- AI-assisted contract attacks

---

## 87. README Public API

README should eventually show:

```js
const {
  runGotcha,
  draftQualityContract,
  confirmQualityContract,
  runContractAttacks
} = require("gotcha-ai");
```

---

## 88. README Provider Boundary

README must make clear:

Gotcha does not ship a model provider.

The developer injects:

```js
generator
```

Gotcha handles:

```text
validation
provenance
filtering
attack execution
ranking
```

---

## 89. Non-Goals

M8 does not include:

- production-model attack execution
- prompt attack generation against a live AI
- automatic model calls built into Gotcha
- provider API keys
- provider lock-in
- AI-generated JavaScript mutation functions
- AI-generated protection callbacks
- AI-generated evaluator code
- automatic contract editing
- automatic severity changes
- semantic judge auditing
- production traces
- observability
- dashboards
- dataset management
- collaboration
- multi-agent orchestration
- GitHub Actions
- shareable reports
- billing
- enterprise auth
- streaming model output
- asynchronous evaluators
- automatic multi-case orchestration

These remain separate product layers.

---

## 90. Security Boundary

M8 is not a sandbox.

Trusted executable callbacks:

```text
evaluator
generator
```

come from the developer.

AI-generated results are untrusted data.

Gotcha must never execute:

- generated strings
- generated functions
- generated callback-shaped values

as code.

---

## 91. Provider Boundary

The generator may perform network activity because it is supplied by the caller.

Gotcha core itself does not need:

```text
API key environment variables
provider SDKs
HTTP clients
model names
```

for M8.

Deterministic tests require none of them.

---

## 92. Failure Transparency

M8 should distinguish clearly between:

```text
generator failed
```

```text
generator returned malformed data
```

```text
zero attacks generated
```

```text
all attacks filtered
```

```text
all attacks caught
```

```text
one or more attacks survived
```

These states must not collapse into the same result.

---

## 93. Meaning of a Survivor

A survivor means:

```text
The evaluator accepted an AI-proposed output intended to violate a confirmed quality rule.
```

A survivor does not automatically mean:

```text
The production model generated this failure.
```

A survivor does not automatically mean:

```text
The referenced rule violation is semantically proven.
```

This distinction must remain visible in product language.

---

## 94. Meaning of a Caught Attack

A caught attack means:

```text
The evaluator rejected this generated candidate.
```

That is evidence the existing evaluator already protects against that specific proposed failure.

It is not evidence that the evaluator is complete.

---

## 95. High-Precision Product Behavior

The generator instructions should optimize for:

```text
minimal mutation
rule relevance
case relevance
realism
subtlety
clear rationale
```

and avoid:

```text
random corruption
many redundant attacks
unrelated failures
invented policy
generic edge-case spam
```

Gotcha should feel like:

```text
a thoughtful adversarial reviewer
```

not:

```text
a fuzzing firehose
```

---

## 96. M8 Success Criteria

M8 is successful when a public consumer can:

1. provide a confirmed M7 Quality Contract
2. provide one eval input
3. provide its known-good output
4. inject an AI generator
5. inject the current evaluator
6. receive validated declarative attack candidates
7. see malformed candidates fail closed
8. see useless duplicates/unchanged outputs filtered transparently
9. run valid candidates through the existing attack engine
10. see survivors ranked using existing Gotcha ranking
11. identify the top evaluator blind spot
12. do all of this without model-provider lock-in or AI-generated executable code

---

## 97. Milestone Definition of Done

M8 is complete when:

- spec is implemented
- `runContractAttacks()` exists
- confirmed contract validation exists
- case input is required
- expected output positive control exists
- AI-safe data boundary exists
- generator output validation exists
- declarative attack schema exists
- rule provenance is Gotcha-owned
- severity mapping is deterministic
- unchanged attacks are filtered
- duplicates are filtered
- existing `attack()` engine is reused
- ranking remains unchanged
- canonical Meeting Scheduler demo works
- unrelated-domain proof works
- deterministic fake-generator tests pass
- external packed-package consumer test passes
- README documents M8 accurately
- all existing tests remain green
- `git diff --check` is clean
- no provider credentials exist in the repo
- no model-generated code execution exists

---

## 98. Roadmap Boundary

M8 is:

```text
AI-generated attacks / mutation expansion
```

It does not replace the broader roadmap.

After M8, the existing plan can continue toward:

```text
shareable reports
GitHub Action
integration surfaces
```

and later product work can decide how contract-generated survivors enter:

```text
CATCH THIS
→ RE-ATTACK
```

without forcing that design into M8 prematurely.

---

## 99. Final M8 Product Flow

```text
USER TEACHES QUALITY
        ↓
QUALITY CONTRACT DRAFT
        ↓
HUMAN CONFIRMS
        ↓
CONFIRMED QUALITY CONTRACT
        +
CURRENT EVAL INPUT
        +
KNOWN-GOOD OUTPUT
        ↓
AI PROPOSES DECLARATIVE ATTACKS
        ↓
GOTCHA VALIDATES EVERYTHING
        ↓
USELESS ATTACKS FILTERED
        ↓
EXISTING EVALUATOR ATTACKED
        ↓
CAUGHT vs SURVIVED
        ↓
SURVIVORS RANKED
        ↓
TOP BLIND SPOT
        ↓
GOTCHA
```

---

## 100. M8 Thesis

M7 taught Gotcha what the user means by good.

M8 asks:

> **If that is what good means, what convincing bad output would your current evaluator still accept?**

The AI proposes the attack.

The confirmed contract provides authority.

Gotcha provides the boundary.

The evaluator provides the test.

The survivor provides the Gotcha moment.
