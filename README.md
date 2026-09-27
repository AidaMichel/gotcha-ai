# Gotcha

> **Your evaluator said PASS. Gotcha found what it missed.**

[![CI](https://github.com/AidaMichel/gotcha-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/AidaMichel/gotcha-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Node.js >=20](https://img.shields.io/badge/Node.js-%3E%3D20-339933)

Gotcha tests AI evaluators by looking for **wrong outputs they still accept**.

It is not another general observability platform or model leaderboard. The core question is narrower:

> **What meaningful bad output can still pass the evaluator I trust?**

## The Aha moment

From a clone of this repository:

```bash
npm ci
npm run demo
```

You should see:

```text
EXPECTED
{
  "product": "Starter Plan",
  "price": 20
}

BAD OUTPUT
{
  "product": "Starter Plan",
  "price": 200
}

YOUR EVALUATOR: PASS
GOTCHA: wrong-price survived
Why it is wrong: Changes the price while keeping the product correct.
Proposed protection: Product price must remain correct.
Re-attack: CAUGHT
```

That demo is deterministic on purpose. It teaches the product loop; it is **not** evidence that a real production model will emit the same failure.

## Two ways to use Gotcha

### 1. Find blind spots from a confirmed quality definition

The guided flow is:

```text
DEFINE QUALITY
    ↓
GENERATE CANDIDATE FAILURES
    ↓
RUN THEM AGAINST YOUR EVALUATOR
    ↓
HUMAN CONFIRMS A REAL BLIND SPOT
    ↓
PROPOSE PROTECTION
    ↓
HUMAN CONFIRMS
    ↓
BOUND REPLAY VERIFICATION
```

Start from the generated config:

```bash
node bin/gotcha.js init
```

Configure your task, teaching examples, known-good case, evaluator, and caller-owned provider transport, then:

```bash
node bin/gotcha.js run
```

Generated survivors are **candidates**, not automatic truth. A selected candidate must be explicitly confirmed by a human as genuinely wrong and relevant enough to remediate before Gotcha will generate a protection proposal.

After you make the evaluator change yourself:

```bash
node bin/gotcha.js verify .gotcha/session-<id>.json
```

Verification replays the bound experiment. Gotcha does not silently patch evaluator code.

### 2. Probe an existing evaluator directly

Use this path when you already have candidate outputs and want to test a modern evaluator without a model/provider.

`probeEvaluator()` supports:

- synchronous or asynchronous evaluators
- boolean pass/fail results
- numeric scores from `0..1`
- explicit score thresholds
- repeated trials
- flaky-result detection
- 95% Wilson confidence intervals
- multiple eval cases in one run
- known-good baseline stability checks

Example config:

```js
"use strict";

module.exports = {
  async evaluator(output) {
    // Boolean:
    // return await myEvaluator(output);

    // Or a numeric score from 0..1:
    return output.qualityScore;
  },

  probe: {
    trials: 5,
    scoreThreshold: 0.8,
    requiredBaselinePassRate: 1,
    survivorPassRate: 0.8,

    cases: [
      {
        id: "price-case",

        expectedOutput: {
          product: "Starter Plan",
          price: 20,
          qualityScore: 0.95
        },

        candidates: [
          {
            id: "wrong-price",
            description:
              "Price changed while the product stayed correct.",

            output: {
              product: "Starter Plan",
              price: 200,
              qualityScore: 0.9
            }
          }
        ]
      }
    ]
  }
};
```

Run:

```bash
node bin/gotcha.js probe --config ./gotcha.config.js
```

The CLI keeps these states separate:

```text
SURVIVOR
FLAKY
CAUGHT
BASELINE UNSTABLE
```

A flaky evaluator is not presented as a clean blind spot.

## Use evaluators written in other languages

`createCommandEvaluator()` provides a JSON process boundary.

Gotcha launches the exact command you provide with `shell: false`, sends one JSON request on stdin, and expects one JSON boolean or number on stdout.

That lets a Node Gotcha run call a Python evaluator, another CLI, or a separate runtime without porting the evaluator into JavaScript.

```js
const {
  createCommandEvaluator,
  probeEvaluator
} = require("./src");

const evaluator =
  createCommandEvaluator({
    command: "python3",
    args: ["./evaluate.py"],
    timeoutMs: 15000
  });

const result =
  await probeEvaluator({
    evaluator,
    trials: 3,
    cases
  });
```

Request shape sent to the command:

```json
{
  "version": 1,
  "kind": "gotcha-evaluator-request",
  "output": {},
  "context": {
    "phase": "candidate",
    "caseId": "example",
    "candidateId": "candidate-1",
    "trial": 1,
    "trials": 3
  }
}
```

## What Gotcha treats as authority

Gotcha intentionally separates evidence from claims.

**Trusted / explicit authority**

- human-confirmed quality rules
- the evaluator's actual result
- known-good baseline behavior
- the human decision that a generated survivor is genuinely wrong
- the human decision to accept/edit/reject a protection
- bound replay verification

**Hints, not truth**

- generator-written rationale
- generator realism/subtlety/novelty/fixability scores
- the claim that a generated candidate would occur in production

Contract-attack ranking does **not** let generator self-scores outrank human-confirmed rule severity. Equal-severity survivors use deterministic ordering.

## What a Gotcha result means

A stable survivor means:

> Under the configured case and trial policy, this evaluator accepted this candidate.

In the guided contract path, it becomes a **confirmed blind spot** only after a human confirms that the candidate really violates the relevant quality rule and matters enough to remediate.

A successful bound verification means:

> The historical evaluator still reproduces the bound experiment, and the improved evaluator catches the selected source finding without introducing a newly surviving attack inside that bound replay.

It does **not** mean:

- the evaluator is globally correct
- every future AI failure is covered
- the production model will definitely emit the generated candidate
- generator self-scores are objective measurements
- one known-good case proves low false-positive rate across all valid outputs

## Why the deterministic core still exists

The hardened remediation engine remains deliberately strict:

- synchronous boolean evaluator
- deterministic replay
- exact baseline identity gate
- explicit human confirmation
- no hidden retry/fallback
- no generated executable evaluator code
- no automatic patch application

The broader `probeEvaluator()` layer handles async, score-based, multi-case, and nondeterministic evaluation **without pretending those semantics are deterministic replay**.

## Public API

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
  completeContractQualityLoop,
  probeEvaluator,
  createCommandEvaluator
} = require("gotcha-ai");
```

## Provider model

Gotcha does not require a specific AI provider.

For the AI-assisted contract path, the caller owns:

- provider/model choice
- credentials
- transport
- provider-specific infrastructure

Gotcha owns the structured request/response boundary, quality-contract authority, attack validation, human-confirmation checkpoints, and verification semantics.

The direct evaluator-probe path requires **no provider**.

## Current limitations

The release candidate still has important limits:

- AI-assisted attack quality needs real-provider/user evidence beyond deterministic fixtures.
- The hardened remediation path remains synchronous/boolean; async and scored evaluators currently use the probe layer rather than bound remediation.
- The probe layer can measure evaluator behavior across many cases, but it does not generate candidate outputs by itself.
- False-positive coverage is limited by the known-good cases you supply.
- npm publication and post-publication smoke remain release gates; do not treat the RC as publicly shipped until those gates are complete.

See [RC1 release readiness](docs/RC1_RELEASE_READINESS.md).

## Engineering proof

CI runs on Node 20, 22, 24, and 26.

The release pipeline also:

- runs the full test suite
- creates an npm tarball
- installs that tarball into a fresh consumer project
- runs the packed CLI demo
- verifies the packed public API

For the detailed API and historical architecture notes, see [API_REFERENCE.md](docs/API_REFERENCE.md).

## Contributing and security

See:

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [CHANGELOG.md](CHANGELOG.md)

## License

MIT
