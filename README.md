# Gotcha

> **Your evals said “pass.” Gotcha disagrees.**

Gotcha attacks your AI quality checks to find convincing bad outputs they still allow through.

Most evals ask:

> “Did this output pass the checks I wrote?”

Gotcha asks:

> **“What important failure can still pass those checks?”**

It mutates a known-good output, attacks your evaluator, ranks the survivors, proposes a protection, and re-attacks to see whether quality improved.

## See it in 5 seconds

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

## How it works

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

Gotcha does not define what “good” means for your business.

**You do.**

## Public API

Install Gotcha:

```bash
npm install gotcha-ai
```

Then use the public API:

```js
const {
  runGotcha
} = require("gotcha-ai");

const result = runGotcha({
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

## Bring your own business idea

Gotcha is domain-agnostic.

It can be used with unrelated AI products and workflows because business meaning stays outside the engine.

The repository currently proves this across:

- Meeting Scheduler
- Support Ticket Classifier
- Order Fulfillment with structured object output

Adding another domain should not require changes to `src/engine.js` or `src/mutation-pack.js`.

## Bring your own evaluator or eval set

Your evaluator defines what currently counts as a pass.

Change the evaluator. Change the eval case. Change the business rules.

The Gotcha flow stays the same:

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
    type: "value-substitution",
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
        return output.price === 20;
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

## Try your own idea

If you cloned the repository and want to experiment with a starter template, run:

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

For the structured-data portability example:

```bash
node examples/order-fulfillment/demo.js
```

## Current scope

Gotcha currently focuses on deterministic, synchronous evaluation and mutation workflows.

It does not yet try to be:

- an LLM-generated mutation system
- a dataset-management platform
- a production observability platform
- a dashboard
- a multi-agent framework
- a JavaScript sandbox

Those are separate product decisions, not requirements for the core attack loop.

## Why Gotcha?

Passing your eval only proves that the output satisfied the checks you remembered to write.

Gotcha is built to find the important checks you forgot.

**Quality should be teachable, testable, attackable, and improvable.**

## Status

Gotcha is under active development.

The current public interface supports:

- deterministic attacks
- survivor ranking
- concrete protections
- re-attack verification
- reusable Mutation Packs
- domain-independent evaluators
- npm installation
- a zero-config CLI demo

The larger product direction remains:

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

The next product layer will move toward teaching Gotcha what quality means instead of requiring users to define every protection manually.

## License
