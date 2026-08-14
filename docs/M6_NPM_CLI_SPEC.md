# M6 — npm Package and Zero-Friction CLI

## Goal

Make Gotcha easy to try and install as a real open-source tool without cloning the repository or reading internal source files.

A first-time user should be able to experience the core Gotcha moment with one command:

```bash
npx gotcha-ai demo
```

A developer who wants to use Gotcha should be able to install it and call the same public API introduced in M5:

```bash
npm install gotcha-ai
```

```js
const { runGotcha } = require("gotcha-ai");
```

M6 is a distribution and onboarding milestone. It must not redesign the engine, Mutation Pack compiler, or public API.

---

## Product Principle

Gotcha should feel like a real tool before it becomes a more intelligent product.

M6 removes adoption friction while preserving the original product thesis:

> Quality should be teachable, testable, attackable, and improvable.

The original V0 loop remains:

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

M6 improves access to the attack loop already built. It does not yet implement TEACH, CONTRACT, or CONFIRM.

---

## Primary User Journeys

### 1. Try Gotcha immediately

The user runs:

```bash
npx gotcha-ai demo
```

They should see a deterministic, understandable sequence equivalent to:

```text
Evaluator said: PASS
Gotcha: wrong-price survived
Why: Changes the price while keeping the product correct.
Protection: Product price must remain correct.
Re-attack: CAUGHT
```

The demo must require:

- no API key
- no config file
- no YAML
- no external eval framework
- no domain knowledge

The point is to understand Gotcha before configuring Gotcha.

### 2. Install Gotcha into another project

The developer runs:

```bash
npm install gotcha-ai
```

Then:

```js
const { runGotcha } = require("gotcha-ai");

const result = runGotcha({
  evaluator,
  expectedOutput,
  mutationPack
});
```

The installed package must expose the same M5 public API. M6 must not introduce a second public programming model.

---

## Public API Invariant

The primary programmatic interface remains:

```js
runGotcha({
  evaluator,
  expectedOutput,
  mutationPack
});
```

A normal consumer must not import:

- `src/engine.js`
- `src/mutation-pack.js`

The package entry point may compose those internal primitives, but external users should not depend on them.

---

## CLI Contract

The CLI should be a thin adapter over the existing public behavior.

Suggested entry point:

```text
bin/gotcha.js
```

Suggested package mapping:

```json
{
  "bin": {
    "gotcha-ai": "./bin/gotcha.js"
  }
}
```

### Supported commands in M6

#### `gotcha-ai demo`

Runs the canonical deterministic quickstart and prints the Gotcha moment.

#### `gotcha-ai --help`

Prints concise usage information.

#### bare `gotcha-ai`

Should print helpful guidance rather than crash.

Suggested output:

```text
Gotcha
Catch what your AI evals miss.

Try:
  gotcha-ai demo
```

#### unknown command

Example:

```bash
gotcha-ai potato
```

Must fail cleanly with a useful message and a non-zero exit code. It must not expose an internal stack trace for ordinary user mistakes.

---

## Package Contract

M6 should make the repository safely packable and installable.

Expected package changes may include:

- remove `"private": true`
- keep package name `gotcha-ai`
- keep `main` pointed at the M5 public entry point
- add `bin` mapping for the CLI
- add repository/homepage/bugs metadata where useful
- define the package files included in the published artifact
- preserve MIT license metadata
- define supported Node version if needed

The package should include only what a consumer needs. Internal tests, temporary artifacts, and unrelated development files should not accidentally become part of the package unless intentionally included.

---

## Packaged-Artifact Verification

Repository-local success is not enough.

M6 must prove the actual npm artifact works.

The acceptance flow should include:

```text
npm pack
  ↓
create empty temporary project
  ↓
install generated tarball
  ↓
run CLI from installed package
  ↓
require("gotcha-ai")
  ↓
run runGotcha()
```

This verifies what a real npm consumer receives rather than what works only inside the source repository.

Tests should avoid depending on global npm state or an already-linked local checkout.

---

## Domain Independence

The CLI and package layer must not encode business concepts.

The canonical demo may use a fictional example, but the reusable CLI/package code must not know about:

- meetings
- support tickets
- orders
- finance
- healthcare
- legal workflows
- any specific business domain

Domain meaning stays in evaluators, expected outputs, Mutation Packs, and examples.

---

## Regression Requirements

M6 must preserve all M1–M5 behavior.

Existing deterministic examples must continue to work.

Existing public API tests must continue to pass.

The M6 test suite should add permanent coverage for at least:

1. CLI demo returns exit code 0 and expected deterministic output.
2. `--help` returns exit code 0 and concise usage text.
3. bare CLI returns helpful guidance without crashing.
4. invalid command returns non-zero and a useful error without an internal stack trace.
5. packed tarball installs into a clean temporary project.
6. installed consumer can `require("gotcha-ai")` and call `runGotcha()`.
7. installed CLI can run from the packed artifact.

---

## README Outcome

The top-level README should make the lowest-friction path obvious.

Primary try-it-now path:

```bash
npx gotcha-ai demo
```

Programmatic path:

```bash
npm install gotcha-ai
```

```js
const { runGotcha } = require("gotcha-ai");
```

The README should still explain the PASS → GOTCHA → protection → RE-ATTACK loop, but cloning the repository should no longer be the primary onboarding path.

---

## M6 Deliverables

- publishable package metadata
- CLI entry point
- `demo` command
- help and bare-command UX
- invalid-command UX
- packaged-artifact regression tests
- installed-library regression test
- installed-CLI regression test
- README update for npm/npx onboarding

---

## Non-Goals

M6 does not include:

- AI-generated Quality Contracts
- TEACH workflow
- example labeling UI
- human confirmation workflow
- LLM-generated attacks
- automatic Mutation Pack generation
- LLM judges
- external eval integrations
- GitHub Actions
- dashboards
- observability
- hosted service
- accounts or authentication
- collaboration
- billing
- multi-agent orchestration
- web UI

These belong to later milestones.

---

## Definition of Done

M6 is complete when all of the following are true:

1. A clean packaged artifact can be installed into an empty temporary project.
2. The installed package exposes `runGotcha()` through `require("gotcha-ai")`.
3. The installed CLI runs the deterministic demo successfully.
4. The user sees the complete PASS → GOTCHA → protection → RE-ATTACK story without cloning the repository.
5. Help, bare-command, and invalid-command behavior are deterministic and user-friendly.
6. Existing examples and previous regression tests remain green.
7. The package/CLI layer remains domain-independent.
8. No consumer needs to import internal engine/compiler files.
9. No TEACH / CONTRACT / LLM generation work is smuggled into M6.
10. Fresh-pack verification succeeds from the actual generated npm tarball.

---

## Roadmap Position

M6 preserves the revised path back to the original Gotcha vision:

```text
M1  Deterministic Gotcha moment            ✅
M2  Mutation engine + survivor ranking     ✅
M3  Generic engine                         ✅
M4  Mutation Packs                         ✅
M5  Dynamic public API + Quickstart        ✅
M6  npm package + npx CLI                  ← current
M7  AI-assisted Quality Contract
M8  AI-generated attacks / mutation expansion
M9  Shareable report + GitHub Action / integrations
```

M7 returns to the first half of the original V0 loop:

```text
TEACH → CONTRACT → CONFIRM
```

M6 exists to make Gotcha effortless to try before adding that intelligence layer.
