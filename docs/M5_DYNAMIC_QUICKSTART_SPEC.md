# Milestone 5 — Dynamic Public Quickstart

## Goal

Make Gotcha easy to adopt for any AI product, business workflow, or eval set through one stable public interface, without modifying Gotcha's core engine.

A new user should be able to understand Gotcha, run it, and create a new domain-specific Mutation Pack within minutes.

## Core Principle

Gotcha must remain domain-agnostic.

Any business idea should use Gotcha.

Gotcha should never be rewritten around a specific business idea.

Domain-specific behavior belongs in:

- the evaluator
- the Mutation Pack
- the quality definition

Not in the Gotcha core.

## M5 Success Experience

A new developer should be able to:

1. Clone Gotcha.
2. Install dependencies.
3. Run one obvious demo command.
4. See an evaluator pass a bad AI output.
5. See Gotcha identify that blind spot.
6. Apply a protection.
7. Re-attack.
8. See measurable improvement.
9. Create a completely different Mutation Pack without editing Gotcha internals.

## Public Interface

M5 should expose one small stable entry point for Gotcha.

A user should not need to import internal files such as:

- src/engine.js
- src/mutation-pack.js

The public API should expose only what a normal Gotcha integration needs.

### Proposed Public API

The primary M5 interface should be one generic orchestration function:

```js
const { runGotcha } = require("./src");

const result = runGotcha({
  evaluator,
  expectedOutput,
  mutationPack
});
```

`runGotcha` should compose the existing Gotcha primitives:

expectedOutput
→ compile Mutation Pack
→ attack evaluator
→ rank survivors
→ apply protection
→ re-attack

It must not implement domain-specific logic.

A new domain should normally require changing only:

- evaluator
- expectedOutput
- mutationPack

not Gotcha itself.

### Eval-Set Scope

M5 must work with arbitrary supported evaluator logic and arbitrary eval cases.

M5 does not need to become a dataset-management or batch-evaluation framework.

Existing eval harnesses may call the same public Gotcha API repeatedly across their own eval sets.

Changing the evaluator or eval case must not require changes to Gotcha internals.

## Dynamic / Domain-Agnostic Requirement

Gotcha must work across unrelated business domains and eval sets.

Examples could include:

- customer support
- scheduling
- ecommerce
- education
- content generation
- classification
- policy compliance
- structured extraction
- workflow automation

These are examples only.

No domain-specific assumptions may be added to the Gotcha core.

## Evaluator Requirement

Gotcha should accept arbitrary supported evaluators.

The evaluator defines what currently counts as "good."

Gotcha attacks that definition rather than assuming its own business rules.

## Mutation Pack Requirement

A new business domain should be added by defining a Mutation Pack and evaluator.

Adding that domain must NOT require changes to:

- src/engine.js
- src/mutation-pack.js

## M5 Deliverables

1. Stable public entry point.
2. Simple package scripts.
3. One minimal public Quickstart.
4. Mutation Pack starter template.
5. README redesigned around the five-minute Gotcha experience.
6. Public API regression tests.
7. Third unrelated domain proving the architecture is genuinely reusable.

## Critical Acceptance Test

Create a completely new third business domain.

It must run through the complete Gotcha flow:

Evaluator
→ Attack
→ Survivor
→ Rank
→ Protection
→ Re-attack

without modifying:

- src/engine.js
- src/mutation-pack.js

If core changes are required to support the new business domain, M5 fails.

The third proof domain must import Gotcha only through the public entry point.

It may not import:

- src/engine.js
- src/mutation-pack.js

directly.

## Dynamic Portability Tests

M5 must prove portability in two independent dimensions.

### 1. Business-domain portability

The third proof domain must be meaningfully unrelated to the existing examples.

It should preferably use a different output shape, such as structured object data rather than only formatted text.

Supporting the new domain must require zero changes to:

- src/engine.js
- src/mutation-pack.js
- the public Gotcha entry point

No domain name, business rule, field name, or workflow-specific branch may be added to Gotcha core.

### 2. Eval-set portability

Gotcha must not be coupled to one evaluator design.

Using the same public Gotcha interface, a developer must be able to supply a different supported evaluator or eval set without changing Gotcha internals.

The evaluator owns the current definition of "pass."

Gotcha owns the generic process of:

Evaluator
→ Attack
→ Survivor
→ Rank
→ Protection
→ Re-attack

Changing the evaluator must not require changing the Gotcha engine or Mutation Pack compiler.

## Architecture Invariant

The public API may know about Gotcha concepts such as:

- evaluator
- expected output
- Mutation Pack
- attacks
- survivors
- protections

It must not know about business concepts such as:

- meetings
- tickets
- refunds
- products
- lessons
- medical records
- invoices

Business meaning belongs outside the core.

## Definition of Done

Fresh clone
→ install
→ run demo
→ understand the failure
→ see Gotcha catch it
→ create another Mutation Pack
→ run it successfully

without reading or editing Gotcha internals.

## Non-Goals

M5 does NOT include:

- LLM-generated mutations
- Contract Builder
- npm publishing
- npx CLI
- GitHub Actions
- external eval integrations
- dashboards
- production observability
- multi-agent orchestration
- billing
- authentication
- JavaScript sandboxing

Those belong to later milestones.

## Product Test

Meeting Scheduler should use Gotcha.

Support Ticket Classifier should use Gotcha.

A completely unrelated third domain should use Gotcha.

None of them should define what Gotcha is.
