# Gotcha

> **Your evals said “pass.” Gotcha disagrees.**

Gotcha helps you discover important AI failures your current quality checks still allow through.

Most evals ask:

> “Did this output pass the checks I wrote?”

Gotcha asks:

> **“What important failure can still pass those checks?”**

The larger Gotcha loop is:

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

Today, Gotcha supports both sides of that flow:

- teach Gotcha what quality means using examples and judgments
- generate a structured Quality Contract for human confirmation
- generate attacks from confirmed Quality Contracts through an injected AI generator
- attack an evaluator with meaningful mutations
- rank the failures that survive
- propose a protection
- re-attack to see whether quality improved

**Quality should be teachable, testable, attackable, and improvable.**

## See the Gotcha moment in 5 seconds

```bash
npx gotcha-ai demo
```

No clone. No config. No API key.

You should see:

```text
Evaluator said: PASS
Gotcha: wrong-price survived
Why: Changes the price while keeping the product correct.
Protection: Product price must remain correct.
Re-attack: CAUGHT
```

The evaluator passed a bad output because it was not checking an important value.

**Gotcha.**

## The problem

AI teams usually define quality by writing checks for failures they already know about.

That creates a blind spot:

```text
Known failure
→ write evaluator
→ evaluator passes
→ assume quality is protected
```

But an evaluator can only reject what it knows how to recognize.

A convincing bad output may still pass every check.

Gotcha is designed to find those survivors.

## Teach Gotcha what quality means

Before Gotcha can attack quality, it needs a definition of what quality means for your task.

Instead of requiring users to start by writing a large evaluation framework, Gotcha can learn from small pieces of teaching evidence:

- a plain-English task description
- examples marked good or bad
- A/B preferences
- optional notes explaining why something matters

Example:

```js
const task =
  "Schedule meetings using the requested person, day, and time.";

const examples = [
  {
    id: "example-1",
    type: "judgment",
    input:
      "Schedule Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 3 PM.",
    judgment: "good"
  },

  {
    id: "example-2",
    type: "judgment",
    input:
      "Schedule Sara on Tuesday at 3 PM.",
    output:
      "Meeting scheduled with Sara on Tuesday at 4 PM.",
    judgment: "bad",
    note:
      "The scheduled time does not match the requested time."
  }
];
```

Examples are **evidence**, not automatic truth.

Gotcha does not silently turn every example into a permanent rule.

## Quality Contracts

Gotcha can use an injected AI generator to propose a structured **Quality Contract** from teaching evidence.

```js
const {
  draftQualityContract
} = require("gotcha-ai");

const draft =
  await draftQualityContract({
    task,
    examples,
    generator
  });
```

A proposed rule contains structured information such as:

```js
{
  id: "rule-1",

  statement:
    "The scheduled time must match the time requested by the user.",

  kind:
    "required",

  severity:
    "critical",

  confidence:
    "high",

  rationale:
    "A bad example changes the requested meeting time.",

  evidence: [
    {
      type: "example",
      exampleId:
        "example-2"
    }
  ]
}
```

Gotcha validates the generated contract before returning it.

The generator cannot silently:

- change the task
- reference unknown examples
- exceed the rule limit
- invent unsupported schema fields that Gotcha depends on
- turn a draft into a confirmed contract

A draft is still only a proposal.

## Humans confirm the contract

The human remains authoritative.

Every proposed rule must receive an explicit decision:

- `accept`
- `edit`
- `reject`

Example:

```js
const {
  confirmQualityContract
} = require("gotcha-ai");

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
          "Never invent a meeting time when the user has not provided one."
      },

      {
        ruleId: "rule-3",
        decision: "reject"
      }
    ]
  });
```

Accepted and edited rules become active.

Rejected rules disappear from the confirmed contract.

If every proposed rule is rejected, Gotcha returns:

```text
no-active-rules
```

It does not pretend an empty contract was meaningfully confirmed.

## AI-assisted, provider-independent

Gotcha does not require a specific model provider.

You inject the generator:

```js
async function generator({
  task,
  examples,
  instructions
}) {
  // Call the model/provider you choose.

  return {
    version: 1,
    task,
    rules: []
  };
}
```

Gotcha owns:

- teaching-input validation
- generation instructions
- contract schema
- evidence validation
- provenance
- human confirmation

The caller owns:

- model provider
- API credentials
- model selection
- provider-specific infrastructure

Gotcha does not ship API keys or require a hosted model account for its deterministic tests and demos.

## Try the Quality Contract example

If you cloned the repository:

```bash
node examples/quality-contract.js
```

You should see:

```text
TEACH: examples accepted
CONTRACT: 3 rules proposed
- rule-1: The scheduled person must match the person requested by the user.
- rule-2: The scheduled time must match the time requested by the user.
- rule-3: If a required meeting time is missing, ask the user for clarification instead of inventing one.
CONFIRM: confirmed
Active rules: 3
```

The example uses a deterministic fake generator so it does not require an external model or API key.

## Attack your evaluator

Once quality is defined, Gotcha’s attack engine looks for bad outputs your evaluator still accepts.

The deterministic Mutation Pack attack flow is:

```text
Known-good output
      +
Your evaluator
      +
Mutation Pack
      ↓
ATTACK
      ↓
Which bad outputs still PASS?
      ↓
RANK SURVIVORS
      ↓
GOTCHA
      ↓
PROTECTION
      ↓
RE-ATTACK
```

A survivor is the interesting part.

It means:

> The output is meaningfully wrong, but the evaluator still said pass.

That is the blind spot Gotcha is trying to surface.

## Install

```bash
npm install gotcha-ai
```

The public package currently exposes:

```js
const {
  runGotcha,
  draftQualityContract,
  confirmQualityContract,
  runContractAttacks
} = require("gotcha-ai");
```

## Attack API

Use `runGotcha()` when you already have:

- a known-good output
- an evaluator
- a Mutation Pack

```js
const {
  runGotcha
} = require("gotcha-ai");

const result =
  runGotcha({
    evaluator,
    expectedOutput,
    mutationPack
  });
```

A new use case should normally change only:

- `expectedOutput`
- `evaluator`
- `mutationPack`

Not the Gotcha core.

## Attack from a confirmed Quality Contract

`runContractAttacks()` connects the confirmed contract to AI-assisted attack generation without coupling Gotcha to a model provider.

You provide:

- a confirmed Quality Contract
- the real input and known-good `expectedOutput`
- your synchronous boolean evaluator
- an injected generator that calls the model/provider you choose

```js
const {
  runContractAttacks
} = require("gotcha-ai");

const result = await runContractAttacks({
  contract: confirmed,
  input,
  expectedOutput,

  evaluator(output) {
    return currentEvaluator(output);
  },

  async generator({
    contract,
    input,
    expectedOutput,
    instructions
  }) {
    // Call the provider/model you choose, then return
    // the validated contract-attack schema.
    return providerGenerateAttacks({
      contract,
      input,
      expectedOutput,
      instructions
    });
  }
});
```

Gotcha owns the contract authority, generator instructions, schema validation, rule attribution, deterministic attack execution, survivor ranking, and data boundary. The caller still owns model credentials, provider selection, and provider-specific infrastructure.

The generator proposes declarative mutated outputs; it does **not** provide executable mutation code. Confirmed rule severity remains authoritative and is not delegated back to the generator.

A contract-attack survivor means an **AI-proposed rule violation passed the evaluator**. For arbitrary natural-language rules, Gotcha does not independently prove that the candidate semantically violates the referenced rule or that a production model produced the same failure.

`runContractAttacks()` ends at ranked survivors and `topFinding` (`GOTCHA`). It does not automatically create a protection or run `CATCH THIS → RE-ATTACK`; those stages belong to the separate deterministic Mutation Pack improvement path.

If you cloned the repository, run the deterministic end-to-end example with:

```bash
node examples/contract-attacks.js
```

The repository command above is not a package-level executable. Installed consumers call the public `runContractAttacks()` API directly.

## Bring your own business idea

Gotcha is domain-agnostic.

Business meaning stays outside the core engine.

The repository proves the attack architecture across unrelated domains including:

- Meeting Scheduler
- Support Ticket Classifier
- Order Fulfillment with structured object output

Adding another domain should not require changes to:

```text
src/engine.js
src/mutation-pack.js
```

The Quality Contract layer follows the same principle.

Your domain evidence goes in.

Gotcha provides the structure and safety boundary.

## Bring your own evaluator or eval set

Your evaluator defines what currently counts as a pass.

Change the evaluator.

Change the eval case.

Change the business rules.

The Gotcha attack flow stays the same:

```text
Evaluator
→ Attack
→ Survivor
→ Rank
→ Protection
→ Re-attack
```

Existing eval harnesses can call `runGotcha()` repeatedly across their own eval sets.

Gotcha does not need to own your dataset.

## Mutation Packs

A Mutation Pack describes meaningful ways a known-good output could become wrong.

```js
const mutationPack = [
  {
    id: "wrong-price",

    type:
      "value-substitution",

    description:
      "Changes the price while keeping the product correct.",

    mutate(output) {
      output.price = 200;

      return output;
    },

    scores: {
      severity: 1,
      realism: 0.9,
      subtlety: 0.9,
      novelty: 0.7,
      fixability: 1
    },

    protection: {
      description:
        "Product price must remain correct.",

      check(output) {
        return (
          output.price === 20
        );
      }
    }
  }
];
```

Gotcha compiles the pack, attacks your evaluator, and ranks the mutations that survive.

Current ranking weights:

| Signal | Weight |
|---|---:|
| Severity | 30% |
| Realism | 25% |
| Subtlety | 20% |
| Novelty | 15% |
| Fixability | 10% |

The goal is not to flood you with failures.

It is to surface the most meaningful blind spots first.

## Catch This

Finding a failure is useful.

Turning it into better quality protection is more useful.

The current deterministic improvement loop:

```text
ATTACK
  ↓
survivor found
  ↓
CATCH THIS
  ↓
protection applied
  ↓
positive control
  ↓
RE-ATTACK
```

Gotcha then compares the number of escaping failures before and after the protection.

The goal is not to claim perfection.

The goal is measurable improvement.

## Try your own attack

If you cloned the repository and want to experiment with a starter template:

```bash
npm run starter
```

Then edit:

```text
examples/starter-template.js
```

Replace:

1. `expectedOutput`
2. `evaluator`
3. `mutationPack`

You should not need to modify Gotcha internals.

## Repository commands

For contributors and people exploring the source repository:

```bash
npm test
npm run demo
npm run quickstart
npm run starter
```

Quality Contract example:

```bash
node examples/quality-contract.js
```

Contract Attack example:

```bash
node examples/contract-attacks.js
```

Structured-data portability example:

```bash
node examples/order-fulfillment/demo.js
```

## Current architecture

Gotcha currently has complementary quality-definition and attack paths.

### Quality definition

```text
TEACH
  ↓
CONTRACT
  ↓
CONFIRM
```

This layer turns human teaching evidence into an explicitly confirmed Quality Contract.

### Confirmed-contract attack path

```text
ATTACK
  ↓
RANK
  ↓
GOTCHA
```

Confirmed Quality Contracts can drive provider-independent AI-assisted attack generation through `runContractAttacks()`. This path stops at ranked survivors and `topFinding`.

### Deterministic Mutation Pack improvement path

```text
GOTCHA
  ↓
CATCH THIS
  ↓
RE-ATTACK
```

The separate Mutation Pack path can continue from a finding into deterministic protection and remediation verification. An automatic bridge from `runContractAttacks()` into those stages is not implemented.

## Current scope

Gotcha currently supports:

- plain-English task descriptions
- good/bad teaching examples
- A/B preference evidence
- evidence-backed Quality Contract drafts
- injected AI generators
- explicit human confirmation
- confirmed-contract AI-assisted attack generation through an injected provider-independent generator
- deterministic attacks
- survivor ranking
- concrete protections
- re-attack verification
- reusable Mutation Packs
- domain-independent evaluators
- npm installation
- a zero-config CLI demo

Gotcha intentionally does **not** yet try to be:

- a production observability platform
- a dataset-management platform
- a dashboard
- a collaboration suite
- a multi-agent framework
- a JavaScript sandbox
- an enterprise auth or billing system
- a GitHub Actions integration

Those are separate product layers.

## What comes next

The confirmed-contract attack bridge is implemented.

The current loop can now move from human-confirmed quality rules to provider-independent AI-assisted attack proposals, then hand those validated proposals back to Gotcha's deterministic engine for execution and ranking.

Future layers can focus on product integrations around that core — for example hosted provider adapters, production workflows, richer remediation, and collaboration — without moving model credentials or provider-specific logic into the deterministic engine.

The aim remains a system that keeps asking:

> **“What important failure are we still allowing through?”**

## Why Gotcha?

Passing your eval only proves that the output satisfied the checks you remembered to write.

Gotcha is built to help find the important checks you forgot — and increasingly, to help define those checks before the attack even begins.

**Quality should be teachable, testable, attackable, and improvable.**

## Status

Gotcha is under active development.

Current implemented milestones include:

- deterministic Gotcha moment
- mutation engine
- survivor ranking
- generic public engine
- Mutation Packs
- dynamic public API
- npm package
- `npx gotcha-ai demo`
- AI-assisted Quality Contract drafting
- human Quality Contract confirmation
- confirmed Quality Contracts connected to provider-independent AI-assisted attack generation via `runContractAttacks()`

The contract-to-attack bridge is implemented; future milestones can build integrations and workflows around this stable core.

## License

MIT
