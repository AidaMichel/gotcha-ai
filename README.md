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
- generate a declarative protection proposal for a caller-selected replayable survivor
- require explicit human confirmation before remediation verification
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
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection,
  generateContractProtectionProposal,
  createStructuredProviderAdapter,
  prepareContractQualityLoop,
  completeContractQualityLoop
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

`runContractAttacks()` ends at ranked survivors and `topFinding` (`GOTCHA`). M13 can turn one caller-selected replayable survivor into an untrusted declarative protection proposal; M10/M12 then keep drafting, human confirmation, evaluator changes, and verification separate. Gotcha never generates executable evaluator code and never applies a draft automatically.

If you cloned the repository, run the deterministic end-to-end example with:

```bash
node examples/contract-attacks.js
```

The repository command above is not a package-level executable. Installed consumers call the public `runContractAttacks()` API directly.

## Generate a protection proposal for a confirmed survivor

M13 closes the proposal-authoring gap without making the model remediation authority.

The caller must explicitly choose a replayable survivor. Gotcha does not silently choose `topFinding`, auto-confirm the result, or generate executable evaluator changes.

```text
SURVIVOR
  ↓
generateContractProtectionProposal()
  ↓
proposal-ready
  ↓
prepareContractQualityLoop()
  ↓
HUMAN INSPECT / ACCEPT | EDIT | REJECT
  ↓
completeContractQualityLoop()
  ↓
VERIFY / RE-ATTACK
```

You can inject your own generator directly:

```js
const generated = await generateContractProtectionProposal({
  experiment: result.experiment,
  sourceAttackId: result.topFinding.id,
  generator
});
```

The successful result contains a fresh declarative M10-compatible `generated.proposal`. It is still only a proposal; `state: "proposal-ready"` is not human confirmation.

For a provider-neutral structured-output boundary, use the adapter's `contract-protection` mode:

```js
const proposalGenerator = createStructuredProviderAdapter({
  transport,
  model: "your-model",
  mode: "contract-protection"
});

const generated = await generateContractProtectionProposal({
  experiment: result.experiment,
  sourceAttackId: result.topFinding.id,
  generator: proposalGenerator
});
```

Gotcha owns the detached request shape, fixed generation instructions, structured proposal schema, task/source/rule binding, and safe result normalization. The caller still owns provider credentials, transport, model choice, the survivor choice, the later human decision, and all executable evaluator changes.

## Remediate and verify a confirmed survivor

M10 continues from a **replayable** `runContractAttacks()` experiment:

```text
GOTCHA
  ↓
DRAFT PROTECTION
  ↓
HUMAN CONFIRM
  ↓
VERIFY
  ↓
RE-ATTACK
```

The protection proposal is declarative data. A human must explicitly accept or edit it before verification. The caller supplies both the historical evaluator and the improved evaluator; Gotcha verifies baseline identity first and only then runs the improved replay.

```js
const draft = await draftContractProtection({
  experiment: result.experiment,
  sourceAttackId: result.topFinding.id,
  proposal: generated.proposal
});

const protection = await confirmContractProtection({
  draft,
  decision: { type: "accept" }
});

const verification = await verifyContractProtection({
  protection,
  evaluator: currentEvaluator,
  improvedEvaluator
});
```

A `verified` result means the selected source finding was caught in the exact replay with no newly surviving bound attack. It is evidence about the bound experiment, not a claim that all future failures are eliminated. Provider/model adapters remain outside the trusted remediation core.

If you cloned the repository, run the deterministic full remediation example with:

```bash
node examples/contract-remediation.js
```

## Orchestrate the confirmed-contract quality loop

M12 provides a two-stage convenience layer around the existing M10 remediation APIs without removing the human checkpoint. M13 can now generate the declarative proposal immediately before that M12 boundary, but it does not change M12's human-confirmation authority:

```text
SURVIVOR
  ↓
generateContractProtectionProposal()
  ↓
proposal-ready
  ↓
prepareContractQualityLoop()
  ↓
AWAIT HUMAN CONFIRMATION
  ↓
completeContractQualityLoop()
  ↓
CONFIRM / REJECT
  ↓
VERIFY / RE-ATTACK
```

The caller explicitly chooses the replayable survivor and can either supply a proposal manually or generate one through M13:

```js
const generated = await generateContractProtectionProposal({
  experiment: result.experiment,
  sourceAttackId: result.topFinding.id,
  generator
});

const checkpoint = await prepareContractQualityLoop({
  experiment: result.experiment,
  sourceAttackId: result.topFinding.id,
  proposal: generated.proposal
});
```

The human must inspect the exact current `checkpoint.draft` and issue the exact decision that is then submitted. After that explicit boundary, completion either stops on rejection or delegates verification to M10:

```js
const loopResult = await completeContractQualityLoop({
  checkpoint,
  decision: { type: "accept" },
  evaluator: currentEvaluator,
  improvedEvaluator
});
```

M13 does not choose a survivor, auto-confirm a proposal, call M12 completion, or generate executable evaluator changes. M12 still does not call a model/provider or make the human decision. If a checkpoint or decision crosses mutable/untrusted storage, the current draft must be shown again and a fresh human decision obtained before completion.

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

Contract Remediation example:

```bash
node examples/contract-remediation.js
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

### Confirmed-contract attack and remediation path

```text
ATTACK
  ↓
RANK
  ↓
GOTCHA
  ↓
PROPOSE PROTECTION
  ↓
DRAFT PROTECTION
  ↓
HUMAN CONFIRM
  ↓
VERIFY / RE-ATTACK
```

Confirmed Quality Contracts can drive provider-independent AI-assisted attack generation through `runContractAttacks()`. M13 can generate a bound declarative proposal for one explicitly selected replayable survivor, including through the provider-neutral `contract-protection` adapter mode. M10 remains remediation authority, and M12 adds the explicit two-stage orchestration around drafting, human confirmation, and verification. Survivor choice, the human decision, and executable evaluator changes remain caller-owned.

### Deterministic Mutation Pack improvement path

```text
GOTCHA
  ↓
CATCH THIS
  ↓
RE-ATTACK
```

The separate Mutation Pack path can continue from a finding into deterministic protection and remediation verification. For the confirmed-contract path, M13 can now generate the declarative proposal while M10/M12 preserve drafting, explicit human confirmation, and verification authority; none of these layers silently select a survivor or generate executable evaluator code.

## Current scope

Gotcha currently supports:

- plain-English task descriptions
- good/bad teaching examples
- A/B preference evidence
- evidence-backed Quality Contract drafts
- injected AI generators
- explicit human confirmation
- confirmed-contract AI-assisted attack generation through an injected provider-independent generator
- caller-selected AI-assisted declarative protection proposal generation for replayable survivors
- provider-neutral structured `contract-protection` proposal generation
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

The confirmed-contract path now covers human-confirmed quality rules, provider-independent AI-assisted attack proposals, caller-selected declarative protection proposals, explicit human remediation confirmation, and deterministic re-attack verification.

Future layers can focus on product integrations around that core — for example hosted provider adapters, production workflows, richer remediation history, and collaboration — without moving model credentials, survivor choice, human confirmation, or executable evaluator authority into the AI proposal seam.

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
- caller-selected AI-assisted declarative protection proposal generation via `generateContractProtectionProposal()`
- provider-neutral `contract-protection` structured adapter mode
- explicit M12 human-confirmed remediation orchestration and re-attack verification

The confirmed-contract path is implemented through proposal generation and explicit human-confirmed verification; future milestones can build integrations and workflows around this stable core.

## License

MIT