# M7 — AI-Assisted Quality Contract

Status: Draft  
Milestone: 7  
Branch: `milestone-7-quality-contract`

## 1. Goal

M7 adds the first AI-assisted product layer to Gotcha.

Until now, Gotcha can attack an evaluator, find survivors, rank them, propose a protection, and re-attack.

But the user still has to define quality manually.

M7 changes that.

A user should be able to teach Gotcha what “good” means using:

- a plain-English task description
- a small set of examples
- good / bad judgments
- optional A/B preferences
- optional short notes

Gotcha uses AI to propose a structured **Quality Contract**.

The user then reviews that contract and explicitly confirms, edits, or rejects its rules.

The core M7 flow is:

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
```

M7 does not replace the existing attack engine.

It creates the quality definition that future Gotcha layers can attack.

---

## 2. Product Promise

A user should not need to know how to write evals before using Gotcha.

They should be able to say what their AI does, show a few examples, and receive a useful draft of what quality means.

Example:

```text
Task:
Schedule meetings from natural-language requests.

Example 1:
Input: Schedule Sara on Tuesday at 3 PM.
Output: Meeting scheduled with Sara on Tuesday at 3 PM.
Good 👍

Example 2:
Input: Schedule Sara on Tuesday at 3 PM.
Output: Meeting scheduled with Sara on Tuesday at 4 PM.
Bad 👎
```

Gotcha may propose:

```text
QUALITY CONTRACT

1. The scheduled time must match the requested time.
2. The scheduled person must match the requested person.
3. The scheduled day must match the requested day.
```

The user remains authoritative.

Gotcha cannot silently decide that these rules are accepted.

---

## 3. Why M7 Exists

Gotcha's current engine answers:

> What bad behavior can survive the evaluator you gave me?

M7 begins answering the earlier question:

> What should the evaluator care about in the first place?

This is essential to the larger product loop:

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
RE-ATTACK
```

M7 implements only:

```text
TEACH → CONTRACT → CONFIRM
```

The existing ATTACK → RANK → GOTCHA → CATCH THIS → RE-ATTACK behavior must remain intact.

---

## 4. Core Product Principles

### 4.1 AI proposes. Humans confirm.

The AI-generated contract is always a draft.

No generated rule becomes authoritative until the user explicitly accepts or edits it.

The system must never treat an unconfirmed draft as a confirmed contract.

### 4.2 Examples are evidence, not truth.

Examples help teach Gotcha.

They are not automatically converted into universal rules.

One example should not cause Gotcha to invent a large policy that the evidence does not support.

Example:

```text
Good:
"The refund was approved."
```

This does not justify inventing:

```text
All refund requests must always be approved.
```

unless the task description or other evidence supports that rule.

### 4.3 High precision over rule quantity.

Gotcha should prefer:

```text
3 useful rules
```

over:

```text
12 speculative rules
```

A smaller contract that accurately reflects the user's intent is better than a comprehensive-looking hallucination.

### 4.4 Rules should be testable.

Bad:

```text
The answer should be high quality.
```

Bad:

```text
The answer should be helpful.
```

Better:

```text
The answer must not change explicitly provided numeric values.
```

Better:

```text
If required information is missing, the system must ask for clarification instead of inventing it.
```

A Quality Contract rule should describe behavior that could eventually be tested or attacked.

### 4.5 AI generation must be provider-independent.

The Gotcha core must not depend directly on one model vendor.

M7 should accept an injected AI generator.

The core API should not require:

```text
OpenAI
Anthropic
Google
or another specific provider
```

Gotcha owns:

- teaching data validation
- prompt construction
- Quality Contract schema
- generated result validation
- confirmation semantics

The caller owns the model provider.

### 4.6 No API keys inside Gotcha.

Gotcha must never:

- hard-code API keys
- store API keys
- commit API keys
- ship API credentials
- require credentials for deterministic tests

---

## 5. Definitions

### Teaching Evidence

Information supplied by the user to explain quality.

Teaching evidence may include:

- task description
- good examples
- bad examples
- A/B preferences
- notes explaining judgments

### Quality Contract Draft

An AI-assisted proposal describing the important quality rules inferred from the teaching evidence.

The rule proposal originates from the AI generator.

Gotcha validates the proposal and attaches deterministic source metadata before returning the public draft.

A draft is not authoritative.

### Confirmed Quality Contract

A contract whose rules have been explicitly accepted or edited by the user.

Only confirmed rules may be treated as user-defined quality requirements.

### Rule

One testable quality requirement.

Example:

```text
The meeting time must match the time explicitly requested by the user.
```

---

## 6. TEACH — Input Model

The minimum teaching input is:

```js
{
  task,
  examples
}
```

`task` is required.

`examples` must contain at least one valid teaching example.

---

## 7. Teaching Example Types

M7 supports two teaching styles.

### 7.1 Judgment Example

The user provides an input/output pair and says whether the output is good or bad.

Example:

```js
{
  id: "example-1",
  type: "judgment",
  input: "Schedule Sara on Tuesday at 3 PM.",
  output:
    "Meeting scheduled with Sara on Tuesday at 3 PM.",
  judgment: "good"
}
```

Bad example:

```js
{
  id: "example-2",
  type: "judgment",
  input: "Schedule Sara on Tuesday at 3 PM.",
  output:
    "Meeting scheduled with Sara on Tuesday at 4 PM.",
  judgment: "bad",
  note:
    "The system changed the requested time."
}
```

Allowed judgments:

```text
good
bad
```

### 7.2 Preference Example

The user compares two outputs.

Example:

```js
{
  id: "example-3",
  type: "preference",
  input:
    "Schedule a meeting with Alex sometime tomorrow.",
  a:
    "What time tomorrow would you like the meeting?",
  b:
    "Meeting scheduled with Alex tomorrow at 9 AM.",
  preferred: "a",
  note:
    "The system should clarify the missing time."
}
```

Allowed preferences:

```text
a
b
```

---

## 8. Input Validation

Gotcha must validate teaching evidence before any AI call.

The following must be rejected:

- missing task
- empty task
- missing examples
- empty examples
- duplicate example IDs
- unsupported example types
- invalid judgments
- invalid preference values
- missing required fields
- malformed teaching objects

Invalid evidence must fail before invoking the AI generator.

---

## 9. CONTRACT — Output Model

The AI proposes the rule content for a structured Quality Contract Draft.

After validating the AI output, Gotcha constructs the public draft and attaches deterministic source metadata.

Canonical public draft shape:

```js
{
  version: 1,

  task:
    "Schedule meetings from natural-language requests.",

  source: {
    exampleIds: [
      "example-1",
      "example-2"
    ]
  },

  rules: [
    {
      id: "rule-1",

      statement:
        "The scheduled time must match an explicitly requested time.",

      kind: "required",

      severity: "critical",

      confidence: "high",

      rationale:
        "Changing the requested time changes the user's intended action.",

      evidence: [
        {
          type: "example",
          exampleId: "example-2"
        }
      ]
    }
  ]
}
```

`source` is owned by Gotcha.

The AI generator must not author or control `source`.

`source.exampleIds` contains the IDs of the validated teaching examples used to construct the draft.

This allows a serialized draft to retain enough provenance for later confirmation-time evidence validation.

---

## 10. Rule Schema

Every proposed rule must contain:

```text
id
statement
kind
severity
confidence
rationale
evidence
```

### 10.1 `id`

Stable identifier inside the draft.

Example:

```text
rule-1
rule-2
rule-3
```

IDs must be unique.

### 10.2 `statement`

The behavioral requirement.

It must:

- be concise
- be understandable without AI expertise
- describe observable behavior
- be specific enough to eventually evaluate

### 10.3 `kind`

Allowed values:

```text
required
forbidden
conditional
```

#### Required

Something the system must do.

Example:

```text
The returned price must match the known product price.
```

#### Forbidden

Something the system must not do.

Example:

```text
The system must not invent a location that the user did not provide.
```

#### Conditional

Something that applies only under a condition.

Example:

```text
If the meeting time is missing, the system must ask for clarification.
```

---

## 11. Severity

Allowed values:

```text
critical
major
minor
```

### Critical

Violation changes the core meaning or action.

Examples:

- wrong price
- wrong person
- wrong date
- unauthorized action

### Major

Meaningful quality failure that may mislead the user but does not completely invalidate the task.

### Minor

Lower-impact quality issue.

Severity is proposed by AI and remains reviewable by the user.

---

## 12. Confidence

Allowed values:

```text
high
medium
low
```

Confidence describes how strongly the teaching evidence supports the proposed rule.

It does not mean the rule is automatically correct.

A low-confidence rule may still be useful.

A high-confidence rule still requires confirmation.

---

## 13. Evidence

Every generated rule must identify why Gotcha proposed it.

Evidence may reference:

```text
task
example
```

Task evidence:

```js
{
  type: "task"
}
```

Example evidence:

```js
{
  type: "example",
  exampleId: "example-2"
}
```

The deterministic validator must verify that referenced example IDs actually exist.

A generated rule must contain at least one evidence reference.

The public draft preserves the validated teaching example IDs in:

```text
source.exampleIds
```

This provenance allows confirmation to revalidate example evidence references even if the draft has been serialized and confirmed later.

---

## 14. Evidence-Bound Generation

The AI must not invent unsupported product policy.

The generation instructions must explicitly require the model to:

1. infer only from supplied teaching evidence
2. avoid adding unrelated quality requirements
3. prefer fewer strong rules over many speculative ones
4. identify uncertainty using confidence
5. cite evidence for every proposed rule
6. write testable behavioral rules
7. avoid vague language such as:
   - be helpful
   - be accurate
   - be good
   - provide quality answers
8. avoid claiming the draft has been confirmed

---

## 15. Maximum Draft Size

M7 should default to a maximum of:

```text
7 proposed rules
```

This protects the high-precision product principle.

The AI should not generate filler simply to reach the limit.

A valid draft may contain between 0 and 7 rules.

Zero rules is valid when the supplied teaching evidence does not support any meaningful quality rule.

Gotcha must prefer an empty draft over inventing unsupported rules.

---

## 16. Deterministic Validation After AI Generation

AI output must never be trusted directly.

Gotcha validates the returned generator output before showing a public draft to the user.

Validation must verify:

- output is an object
- version is supported
- task is present
- rules is an array
- rule IDs are unique
- rule statements are non-empty
- rule kinds are valid
- severity values are valid
- confidence values are valid
- evidence exists
- evidence types are valid
- referenced example IDs exist
- returned task exactly matches the validated task supplied by the user
- number of rules is within the allowed maximum
- no unsupported fields are relied upon for execution

Malformed AI output must fail clearly.

Do not silently repair structurally invalid AI output.

After successful validation, Gotcha must construct:

```js
source: {
  exampleIds: [...]
}
```

from the already validated teaching evidence.

The AI generator must not be trusted to provide this metadata.

---

## 17. AI Generator Boundary

M7 introduces an injected generator interface.

Conceptually:

```js
async function generator({
  task,
  examples,
  instructions
}) {
  // AI provider call

  return {
    version: 1,
    task,
    rules: []
  };
}
```

Gotcha calls the generator.

The generator returns structured rule data.

Gotcha validates that data.

Gotcha then attaches deterministic `source` metadata to the public draft.

The core package does not need to know which model generated it.

---

## 18. Public Draft API

M7 should introduce:

```js
draftQualityContract()
```

Usage:

```js
const {
  draftQualityContract
} = require("gotcha-ai");

const draft =
  await draftQualityContract({
    task:
      "Schedule meetings from natural-language requests.",

    examples,

    generator
  });
```

Result:

```js
{
  version: 1,
  task: "...",
  source: {
    exampleIds: [
      "example-1",
      "example-2"
    ]
  },
  rules: [...]
}
```

`source` is constructed by Gotcha after validating the teaching evidence.

The AI generator must not author or control `source`.

`source.exampleIds` records the validated teaching example IDs so that a serialized draft can later be safely passed to `confirmQualityContract()` without requiring the original teaching examples again.

Confirmation must validate every example evidence reference against `source.exampleIds`.

This API is asynchronous because real AI generation is asynchronous.

---

## 19. CONFIRM

Drafting a Quality Contract must not automatically make it authoritative.

The second M7 operation is:

```js
confirmQualityContract()
```

Conceptually:

```js
const confirmed =
  confirmQualityContract({
    draft,

    decisions: [
      {
        ruleId: "rule-1",
        decision: "accept"
      },

      {
        ruleId: "rule-2",
        decision: "edit",
        statement:
          "The scheduled day must exactly match the requested day."
      },

      {
        ruleId: "rule-3",
        decision: "reject"
      }
    ]
  });
```

---

## 20. Confirmation Decisions

Allowed decisions:

```text
accept
edit
reject
```

### Accept

Use the proposed rule.

### Edit

Use the human-edited rule instead of the AI proposal.

### Reject

Do not include the rule in the confirmed contract.

---

## 21. Human Authority

Human confirmation always wins.

If AI proposes:

```text
The assistant must always ask for confirmation before scheduling.
```

and the human rejects it:

```text
reject
```

the confirmed contract must not contain that rule.

If the human edits:

```text
The assistant must ask for confirmation only when the requested time is ambiguous.
```

the human version becomes authoritative.

The AI version must not silently reappear later.

---

## 22. Confirmed Contract Shape

Example:

```js
{
  version: 1,

  status: "confirmed",

  task:
    "Schedule meetings from natural-language requests.",

  rules: [
    {
      id: "rule-1",

      statement:
        "The scheduled time must match an explicitly requested time.",

      kind: "required",

      severity: "critical"
    },

    {
      id: "rule-2",

      statement:
        "If the requested time is missing, the system must ask for clarification.",

      kind: "conditional",

      severity: "major"
    }
  ]
}
```

Only accepted or edited rules appear in the confirmed `rules`.

Rejected rules do not become active requirements.

The Gotcha-owned draft `source` metadata is used to validate provenance during confirmation.

The confirmed contract does not need to expose that draft-only metadata as an active quality rule.

---

## 23. Confirmation Validation

Confirmation must reject:

- unknown rule IDs
- duplicate decisions for the same rule
- unsupported decision values
- edit decisions without replacement text
- empty edited statements
- malformed draft objects
- missing or malformed draft source metadata
- duplicate or invalid `source.exampleIds`
- example evidence references that do not exist in `source.exampleIds`

Every proposed rule must receive an explicit decision before the contract becomes fully confirmed.

This prevents accidental silent acceptance.

Confirmation must not rely on the AI generator to reconstruct evidence provenance.

It must use the Gotcha-owned `source.exampleIds` stored in the draft.

---

## 24. No Auto-Confirmation

M7 must never implement behavior like:

```text
AI confidence = high
→ automatically confirmed
```

or:

```text
3 supporting examples
→ automatically confirmed
```

Confidence and evidence help humans review the draft.

They do not replace confirmation.

---

## 25. Canonical M7 Demo

Use a fictional Meeting Scheduler.

Task:

```text
Schedule meetings from natural-language requests.
```

Teaching evidence:

```js
[
  {
    id: "example-1",
    type: "judgment",
    input:
      "Schedule a meeting with Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 3 PM.",
    judgment: "good"
  },

  {
    id: "example-2",
    type: "judgment",
    input:
      "Schedule a meeting with Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 4 PM.",
    judgment: "bad",
    note:
      "The requested time changed."
  },

  {
    id: "example-3",
    type: "judgment",
    input:
      "Schedule a meeting with Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with John on Tuesday at 3 PM.",
    judgment: "bad",
    note:
      "The requested person changed."
  },

  {
    id: "example-4",
    type: "preference",
    input:
      "Schedule a meeting with Sara tomorrow.",
    a:
      "What time tomorrow would you like the meeting?",
    b:
      "Meeting scheduled with Sara tomorrow at 9 AM.",
    preferred: "a",
    note:
      "The time is missing and should be clarified."
  }
]
```

A reasonable AI draft might be:

```text
1. The scheduled person must match the requested person.

2. The scheduled time must match an explicitly requested time.

3. If a required meeting time is missing, the system must ask for clarification rather than inventing one.
```

The exact wording is not required to be deterministic.

The structure and safety guarantees are.

The public draft returned by Gotcha additionally records the validated teaching example IDs in `source.exampleIds`.

---

## 26. Testing Strategy

AI output itself is nondeterministic.

Gotcha's tests must not depend on live model behavior.

Tests should inject deterministic fake generators.

Example:

```js
const generator =
  async () => ({
    version: 1,

    task:
      "Schedule meetings from natural-language requests.",

    rules: [
      {
        id: "rule-1",
        statement:
          "The scheduled time must match the requested time.",
        kind: "required",
        severity: "critical",
        confidence: "high",
        rationale:
          "A bad example changed the requested time.",
        evidence: [
          {
            type: "example",
            exampleId: "example-2"
          }
        ]
      }
    ]
  });
```

The fake generator does not create `source`.

Gotcha constructs `source` deterministically from validated teaching evidence.

This allows deterministic testing of Gotcha's behavior around AI.

---

## 27. Required Test Groups

### TEACH validation

Test:

- valid judgment examples
- valid preference examples
- missing task
- empty examples
- duplicate IDs
- bad judgment
- bad preference
- malformed examples

### Generator boundary

Test:

- generator receives validated evidence
- asynchronous generator works
- generator errors propagate clearly
- malformed generator output is rejected
- generator cannot bypass contract validation
- generator does not control Gotcha-owned source metadata

### Contract validation

Test:

- valid draft
- duplicate rule IDs
- empty statements
- unsupported kinds
- unsupported severity
- unsupported confidence
- missing evidence
- unknown example references
- too many proposed rules
- source metadata reflects validated teaching example IDs

### Confirmation

Test:

- accepting a rule
- rejecting a rule
- editing a rule
- mixed decisions
- unknown rule IDs
- duplicate decisions
- missing decisions
- invalid edit
- rejected rules absent from active contract
- edited text overrides AI text
- malformed source metadata is rejected
- unknown example evidence references are rejected against `source.exampleIds`
- serialized drafts retain enough evidence provenance for confirmation

### Regression

Existing Gotcha tests must continue passing.

M7 must not break:

```text
runGotcha()
Mutation Packs
attack()
ranking
positive controls
re-attack
CLI demo
packed npm artifact behavior
```

---

## 28. Architecture Boundary

M7 must not modify the semantics of:

```text
src/engine.js
```

unless a concrete M7 requirement proves that a change is necessary.

M7 should not redesign the mutation engine.

M7 should add the Quality Contract layer beside the existing engine.

Conceptually:

```text
Teaching Evidence
      │
      ▼
Quality Contract Builder
      │
      ▼
Draft Contract
      │
      ▼
Human Confirmation
      │
      ▼
Confirmed Contract
```

The Quality Contract Builder owns validation and deterministic source metadata.

The existing engine remains:

```text
Evaluator
   +
Mutations
   │
   ▼
Attack Engine
   │
   ▼
Survivors
   │
   ▼
Ranking
   │
   ▼
Protection
   │
   ▼
Re-attack
```

Future milestones connect these two layers.

---

## 29. Suggested Files

M7 may introduce:

```text
src/quality-contract.js
test/quality-contract.test.js
examples/quality-contract.js
docs/M7_QUALITY_CONTRACT_SPEC.md
```

`src/index.js` may expose the new public functions.

Example:

```js
module.exports = {
  runGotcha,
  draftQualityContract,
  confirmQualityContract
};
```

Avoid unnecessary file proliferation.

---

## 30. What M7 Must NOT Do

M7 does not include:

- AI-generated mutations
- automatic mutation-pack generation
- automatic evaluator generation
- automatic protection generation from contracts
- automatic contract confirmation
- production observability
- hosted model infrastructure
- model routing
- billing
- authentication
- dashboards
- collaboration
- browser UI
- GitHub Actions
- external eval-platform integrations
- multimodal teaching
- long-term contract history
- autonomous multi-agent orchestration

Those belong to later milestones.

---

## 31. M7 Is Not an Eval Generator

The purpose of M7 is not:

```text
User gives examples
→ Gotcha secretly writes a giant evaluator
```

M7 creates an explicit, reviewable definition of quality.

The contract must remain visible to the user.

The product advantage is that users can inspect:

```text
What does Gotcha think I care about?
```

before Gotcha starts attacking it.

---

## 32. M7 Is Not an AI Judge

The model generating the draft is not the final judge of quality.

It acts as a contract builder.

The final authority remains:

```text
human-confirmed Quality Contract
```

Judge auditing and AI-as-judge evaluation remain later concerns.

---

## 33. Failure Behavior

If the evidence is insufficient, the AI should be allowed to propose fewer rules.

Example:

```text
Only one meaningful quality rule is supported.
```

That is better than inventing six more.

If the generator returns invalid structure:

```text
fail clearly
```

Do not silently guess what it meant.

If the human rejects every proposed rule:

```text
the result must not pretend a useful contract exists
```

A draft with zero rules is valid.

If confirmation results in zero active rules, the result must use:

```text
status: "no-active-rules"
```

instead of pretending that a usable Quality Contract was confirmed.

A contract with `status: "no-active-rules"` is not authoritative and must not be used as a confirmed Quality Contract.

The API should clearly indicate that no active rules were confirmed.

If draft provenance is malformed or an example evidence reference is not present in the Gotcha-owned `source.exampleIds`, confirmation must fail clearly.

Do not silently trust or repair the reference.

---

## 34. User Trust Requirement

The user should always be able to answer:

```text
Why did Gotcha propose this rule?
```

That is why every proposed rule includes:

```text
rationale
evidence
confidence
```

The public draft also preserves the validated teaching example IDs required to verify those evidence references later.

The contract must not feel like unexplained AI magic.

---

## 35. Success Criteria

M7 passes when all of the following are true.

### TEACH

A developer can provide:

```text
task
+
small set of examples / preferences
```

without writing eval code.

### CONTRACT

An injected AI generator can produce a structured Quality Contract Draft proposal.

Gotcha validates that proposal and adds deterministic source metadata.

### EVIDENCE

Every proposed rule is traceable to supplied evidence.

Example evidence references remain verifiable after the public draft is created.

### VALIDATION

Malformed or unsupported AI output cannot become a valid contract.

Malformed draft provenance cannot bypass confirmation validation.

### CONFIRM

Every proposed rule requires an explicit human:

```text
accept
edit
or
reject
```

### AUTHORITY

Human edits override AI proposals.

Rejected rules are not active.

### PROVIDER INDEPENDENCE

Gotcha core does not depend on a specific LLM vendor.

### REGRESSION SAFETY

All existing M1–M6 functionality continues to work.

---

## 36. M7 Demo Success Moment

The intended M7 product moment is:

```text
You:
"Here is what my AI does."

You:
"Here are a few outputs I liked and disliked."

Gotcha:
"Based on those examples, I think these are the rules you care about."

You:
"Yes."
"Change this one."
"Remove that one."

Gotcha:
"Quality Contract confirmed."
```

This is the bridge from:

```text
I need to know how to build evals.
```

to:

```text
I can teach Gotcha what matters.
```

---

## 37. Bridge to M8

M7 ends with:

```text
Confirmed Quality Contract
```

M8 will use that confirmed contract to expand ATTACK.

Conceptually:

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
  ↓
AI-GENERATED ATTACKS
  ↓
RANK
  ↓
GOTCHA
```

M8 may use confirmed contract rules to propose new mutations and attacks.

That work is intentionally excluded from M7.

---

## 38. Definition of Done

M7 is complete only when:

- Quality Contract schema is implemented
- teaching evidence validation is implemented
- `draftQualityContract()` exists
- provider-independent generator injection works
- AI output validation exists
- Gotcha-owned draft source metadata is implemented
- `confirmQualityContract()` exists
- accept / edit / reject work
- unconfirmed rules cannot become authoritative
- evidence references are validated during drafting
- evidence references remain verifiable during confirmation
- deterministic fake-generator tests cover the AI boundary
- canonical Meeting Scheduler example works
- existing test suite remains green
- documentation clearly explains TEACH → CONTRACT → CONFIRM
- Codex review finds no major issues
- PR is reviewed before merge


M7 should make Gotcha meaningfully smarter without making Gotcha less trustworthy.
