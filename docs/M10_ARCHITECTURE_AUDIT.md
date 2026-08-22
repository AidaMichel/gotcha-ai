# M10 — Contract Remediation Architecture Audit

Status: Complete
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe architecture that can move the confirmed-contract path from:

```text
GOTCHA
```

to:

```text
CATCH THIS
  ↓
RE-ATTACK
```

without violating the safety and authority boundaries already established by M7–M9?

---

## 2. Current Architecture Observed

### 2.1 Public orchestration is split by attack source

`src/index.js` currently exposes:

```text
runGotcha
draftQualityContract
confirmQualityContract
runContractAttacks
```

`runGotcha()` compiles a developer-authored Mutation Pack and passes its compiled mutations into the deterministic `runImprovementLoop()`.

The confirmed-contract path is separate and ends in `runContractAttacks()`.

### 2.2 Deterministic Mutation Pack remediation already contains trusted executable checks

`src/mutation-pack.js` requires every Mutation Pack entry to include:

```js
protection: {
  description,
  check
}
```

The protection check must be a trusted local synchronous function.

The compiler emits both:

```text
protection
protectionCheck
```

onto the compiled mutation.

### 2.3 `runImprovementLoop()` assumes that executable protection already exists

`src/engine.js` selects the top surviving mutation and requires:

```js
topFinding.protectionCheck
```

to be a function.

It then creates an improved evaluator by combining:

```text
existing evaluator
AND
protectionCheck
```

It positive-controls the known-good output and then re-attacks.

This is correct for developer-authored Mutation Packs.

### 2.4 Contract attacks intentionally contain no executable protection

`src/contract-attacks.js` compiles model-produced attacks into declarative attack records containing:

```text
id
ruleId
rule
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

There is no `protectionCheck`.

This is consistent with M8's explicit rule that model output is data, not executable mutation/protection code.

### 2.5 `runContractAttacks()` already owns the hard part of safe replay

The current M8 implementation independently validates:

- confirmed contracts
- AI-safe input/output data
- generator output schema
- rule attribution
- score ranges
- duplicate semantics
- positive-control behavior
- evaluator return type
- callback/intrinsic restoration
- supported cross-realm evaluator behavior

It returns:

```js
{
  version,
  task,
  baselinePassed,
  generatedAttacks,
  discardedAttacks,
  attack,
  topFinding
}
```

This is sufficient data to replay the same candidate set later.

---

## 3. Primary Architecture Finding

A direct M8 -> `runImprovementLoop()` bridge is architecturally wrong.

Why:

```text
runImprovementLoop()
requires executable protectionCheck
```

while:

```text
M8 model output
must remain declarative data
```

The naive bridge would require one of the following bad choices:

1. let the AI generate executable JavaScript;
2. execute code-like strings returned by the AI;
3. synthesize a fake `protectionCheck` that only blacklists the exact attack output;
4. weaken the existing M8 data/code boundary.

All four choices are rejected.

---

## 4. Product/Authority Finding

Attack candidates and remediation intent require different human-authority rules.

M8 attacks do not change policy. They are temporary probes, so they can run after deterministic validation without human confirmation.

A remediation intent is different. If implemented, it changes which outputs the evaluator rejects.

Therefore M10 needs an explicit human-confirmation seam analogous to M7:

```text
AI proposes
  ↓
human accepts / edits / rejects
```

This must happen before remediation verification.

---

## 5. Executable-Implementation Finding

For arbitrary natural-language output, the repository currently has no finite safe compiler that can convert:

```text
"Reject outputs whose time differs from the requested time"
```

into a general executable deterministic check.

The existing deterministic Mutation Pack path can do this only because the developer already supplied the check function.

Therefore M10 V1 must not claim automatic universal implementation.

The executable artifact should be supplied as:

```js
improvedEvaluator(output) -> boolean
```

by the caller after human confirmation.

This is both safer and closer to what a real integration ultimately deploys.

---

## 6. Why `improvedEvaluator` Is Better Than a New `protectionCheck` API

One considered design was:

```js
verifyContractProtection({
  evaluator,
  protectionCheck
})
```

with Gotcha composing the two callbacks.

That design was rejected for M10 V1 for two reasons.

### 6.1 It implies Gotcha owns implementation composition

A real evaluator change may involve:

- updating an existing rule
- adding a parser
- changing a threshold
- changing an upstream deterministic check
- restructuring evaluator logic

An `improvedEvaluator` lets the caller verify the actual intended post-change behavior rather than a temporary Gotcha wrapper.

### 6.2 It preserves the established M8 callback boundary cleanly

`runContractAttacks()` can execute the old evaluator and improved evaluator as separate evaluator callbacks, each through the same established safe evaluator path.

If M10 wrapped two caller callbacks inside one M8 evaluator callback, accidental callback-side intrinsic mutation in the first nested callback could affect the second before M8 restores the outer callback boundary.

Passing each full evaluator separately avoids creating that new seam.

---

## 7. Replay Finding

M10 does not need a new attack engine.

The full M8 attack set can be reconstructed into a deterministic replay generator.

For each validated generated attack:

```text
id              -> id
ruleId          -> ruleId
type            -> type
description     -> description
rationale       -> rationale
output          -> mutatedOutput
realism         -> scores.realism
subtlety        -> scores.subtlety
novelty         -> scores.novelty
fixability      -> scores.fixability
```

Severity must not be copied as generator authority.

M8 should re-derive severity from the confirmed rule exactly as it does today.

The same replay generator can then be passed to `runContractAttacks()` twice:

```text
old evaluator
improved evaluator
```

No provider/model call is needed during verification.

---

## 8. Why Reuse `runContractAttacks()` Instead of Calling `attack()` Directly

Calling `src/engine.js#attack()` directly would be simpler mechanically, but it would bypass M8's hardened evaluator/data path.

That would duplicate or lose behavior around:

- canonical snapshots
- positive control
- async-evaluator rejection
- cross-realm evaluator compatibility
- intrinsic restoration
- generated-attack schema validation
- contract-derived severity

The audit therefore recommends:

> Treat `runContractAttacks()` as the contract-attack replay execution boundary.

M10 should build on top of it, not around it.

---

## 9. Source-Finding Reproducibility Finding

M10 must not trust the old result's historical:

```text
survived: true
```

as proof that the current baseline evaluator still has the same blind spot.

At verification time, the supplied baseline evaluator may have changed.

Therefore M10 must recompute baseline behavior from the exact replay set.

A source finding counts as remediated only if:

```text
baseline replay: source attack survives
after replay:    source attack is caught
```

If the source attack no longer survives baseline, the correct state is:

```text
source-finding-not-reproducible
```

not a synthetic success.

---

## 10. Regression Finding

Because M10 verifies a whole caller-supplied `improvedEvaluator`, it is possible for the new evaluator to accidentally loosen an older check.

Therefore survivor-count improvement alone is insufficient.

Example:

```text
before survivors: [A, B]
before caught:    [C]

after survivors:  [B, C]
```

Survivor count did not increase, but `C` regressed.

M10 must compare identities and report:

```text
regressionAttackIds
```

A verification cannot pass with any replay-set regression.

---

## 11. Positive-Control Finding

The existing M8 boundary already requires the evaluator to pass `expectedOutput` before attacks run.

This gives M10 a strong verification invariant for free:

```text
old evaluator must pass known-good
improved evaluator must pass known-good
```

If the improved evaluator catches the source attack by also rejecting the known-good output, verification must fail.

M10 should rely on the M8 positive-control path, not invent a second divergent implementation.

---

## 12. Natural-Language Equivalence Finding

Even after a human confirms:

```text
Protection statement:
Reject wrong meeting times.
```

and the caller supplies an improved evaluator, Gotcha cannot generally prove that the evaluator's source code is semantically equivalent to that sentence.

M10 can prove only observable behavior on the replay set.

Therefore documentation must avoid claims such as:

```text
"The evaluator now implements the protection correctly."
```

Preferred claim:

```text
"The supplied improved evaluator caught the selected finding and introduced no regressions on this replayed attack set while preserving the known-good output."
```

---

## 13. Recommended Public Surface

The audit recommends exactly three new APIs:

```text
draftContractProtection
confirmContractProtection
verifyContractProtection
```

### Why split the APIs?

The user may need time between:

```text
confirm protection
```

and:

```text
implement evaluator change
```

A single blocking `runRemediationLoop()` cannot honestly span that human/software-development handoff.

The three-phase API also preserves serialization and external workflow integration.

---

## 14. Recommended New Module

Preferred additive module:

```text
src/contract-remediation.js
```

Responsibilities:

- validate remediation options
- validate selected M8 finding
- invoke protection generator through the established AI-data/callback philosophy
- validate protection draft
- apply human confirmation
- validate confirmed protection
- convert validated generated attacks to replay-generator data
- call `runContractAttacks()` for baseline replay
- call `runContractAttacks()` for improved replay
- compute transition/regression metrics

It should not own:

- generic attack ranking
- Mutation Pack compilation
- provider SDKs
- evaluator code generation

---

## 15. Existing Files That Should Stay Stable

### `src/engine.js`

Recommendation: unchanged.

Reason: its current improvement loop is internally coherent for trusted Mutation Pack protection callbacks. M10 does not need to weaken or overload it.

### `src/mutation-pack.js`

Recommendation: unchanged.

Reason: developer-authored Mutation Pack protection remains a valid separate deterministic path.

### `src/contract-attacks.js`

Recommendation: prefer unchanged public contract.

M10 should consume `runContractAttacks()` as the existing public/internal execution boundary.

If a tiny internal helper export becomes necessary during implementation, treat it as a spec-review event and prove that public M8 behavior remains unchanged.

---

## 16. Expected Implementation Diff

Likely M10 implementation files:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
test/public-api.test.js
examples/contract-remediation.js
package.json
README.md
```

Potential package test changes are expected so an isolated tarball consumer verifies the new public APIs.

No implementation is authorized by this audit to modify `src/engine.js` or `src/mutation-pack.js` silently.

---

## 17. Data-Boundary Reuse Recommendation

M10 should preserve the same broad AI-safe value policy already established for M8:

```text
null
boolean
finite number
string
ordinary arrays
ordinary plain objects
```

with the same rejection posture for executable/runtime-capability-bearing values.

The audit does not recommend inventing a second incompatible canonical-data model.

Where practical, M10 should reuse existing AI-data helpers and the M8 callback-boundary patterns rather than copy-pasting security logic.

---

## 18. One-Finding-at-a-Time Recommendation

M10 V1 should remediate one selected survivor.

Why:

- human authority is clearer
- provenance is clearer
- verification success is interpretable
- conflicting protections are avoided
- one protection cannot hide another finding's regression
- API output stays deterministic

Batch remediation can be layered later after single-finding semantics are proven.

---

## 19. No Exact-Output Blacklist Shortcut

A generated protection should not simply say:

```text
Reject exactly this mutatedOutput object/string.
```

That can make the replay look green without addressing the confirmed rule.

M10 cannot formally prove semantic generalization, but generator instructions and examples should prefer rule-level evaluator intent over attack-instance blacklisting.

Verification documentation must still admit that replay success does not prove generalization.

---

## 20. Architecture Decision Record

### Decision A

**Do not auto-generate executable evaluator code.**

Reason: preserves M8's core data/code boundary.

### Decision B

**Require human confirmation for remediation intent.**

Reason: remediation is policy-affecting.

### Decision C

**Caller supplies the actual improved evaluator.**

Reason: real implementation remains trusted local code.

### Decision D

**Replay exact validated attack candidates.**

Reason: deterministic before/after comparison.

### Decision E

**Reuse `runContractAttacks()` for both baseline and after.**

Reason: avoids duplicating M8 evaluator/data safety semantics.

### Decision F

**Do not modify the deterministic engine by default.**

Reason: M10 is a new bridge, not an engine redesign.

### Decision G

**Verification success requires source closure + positive control + zero replay regressions.**

Reason: survivor-count improvement alone can hide regressions.

---

## 21. Implementation Risk Register

### Risk: duplicated M8 validation logic

Mitigation: reuse `runContractAttacks()` for replay; reuse AI-data helpers.

### Risk: AI protection output becomes implicit policy

Mitigation: mandatory `confirmContractProtection()` boundary.

### Risk: overclaiming remediation correctness

Mitigation: narrow replay-set verification language in API and README.

### Risk: stale source finding

Mitigation: re-run the baseline evaluator before measuring remediation.

### Risk: improved evaluator fixes one attack but breaks another

Mitigation: compare baseline-caught identities against after survivors.

### Risk: exact-output overfitting

Mitigation: generator instructions prohibit one-off blacklist framing; docs do not claim generalization.

### Risk: implementation expands into provider/codegen tooling

Mitigation: locked Not-M10 list and review stopping rule in the companion spec.

---

## 22. Audit Conclusion

M10 is feasible without redesigning the existing engine and without weakening the AI-data safety model.

The smallest coherent architecture is:

```text
M8 SURVIVOR
  ↓
DECLARATIVE PROTECTION DRAFT
  ↓
HUMAN CONFIRMATION
  ↓
CALLER-SUPPLIED IMPROVED EVALUATOR
  ↓
M8 DETERMINISTIC REPLAY — OLD EVALUATOR
  ↓
M8 DETERMINISTIC REPLAY — IMPROVED EVALUATOR
  ↓
SOURCE CLOSURE + POSITIVE CONTROL + REGRESSION CHECK
```

This closes the product loop in a way that is measurable, provider-independent, and compatible with the existing trust model.

Implementation should proceed only against the companion locked M10 spec.
