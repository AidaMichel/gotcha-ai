# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 3
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe architecture that can move the confirmed-contract path from `GOTCHA` to measurable remediation without weakening M8's data/code boundary, allowing the original experiment to be rebound, or allowing a later evaluator to redefine baseline history?

---

## 2. Current Repository Facts

### Deterministic Mutation Pack path

`src/mutation-pack.js` requires developer-authored trusted executable `protection.check()` callbacks. `src/engine.js#runImprovementLoop()` can therefore compose that trusted check with the evaluator and re-attack.

### Confirmed-contract path

`src/contract-attacks.js` deliberately compiles model-produced attacks as declarative data only.

A successful `runContractAttacks()` invocation already owns, at one trusted execution boundary:

- the validated confirmed contract snapshot
- canonical input
- canonical expected output
- complete retained `generatedAttacks`
- deterministic `attack.results`
- caught/survived classifications
- ranked survivor order
- `topFinding`

This means M8 is also the only natural place to bind the original remediation experiment as one unit.

---

## 3. Decision: No Direct `runImprovementLoop()` Bridge

A direct contract-attack -> `runImprovementLoop()` bridge would require manufacturing an executable `protectionCheck` from model-produced remediation data.

Rejected options:

- execute AI-generated JavaScript
- evaluate code-like strings
- automatically apply generated patches
- fake remediation by blacklisting exactly one bad output
- weaken the existing M8 data/code boundary

M10 therefore uses declarative remediation intent + human confirmation + caller-supplied improved evaluator.

---

## 4. Decision: Human Confirmation Is Mandatory

M8 attack candidates are temporary probes and do not change policy.

A remediation intent changes what the evaluator should reject if implemented. Therefore it needs explicit `accept`, `edit`, or `reject` authority before verification.

Only the protection statement is editable in V1. Experiment/rule provenance remains immutable.

---

## 5. Decision: Verify the Actual Improved Evaluator

M10 verifies a full caller-supplied `improvedEvaluator`, not a temporary Gotcha wrapper around `evaluator + protectionCheck`.

Reasons:

- a real evaluator change may update parsers, thresholds, rules, or structure
- verification should exercise the actual intended post-change behavior
- old and improved evaluators can each run independently through the established M8 evaluator boundary
- Gotcha does not need to own executable remediation composition

---

## 6. Adversarial Architecture Review History

### Revision 1 findings

Codex identified two experiment-rebinding flaws:

1. verification could accept a partial/substituted attack set
2. verification could accept a different case from the one used to choose the finding

Revision 2 moved contract/case/attacks into the protection artifact and removed verification-time replacements.

### Revision 2 findings

Fresh exact-head review found that this was still one boundary too late:

1. drafting still accepted a bare caller-labelled `generatedAttacks` array, so a sliced set could be labelled complete
2. contract/input/expectedOutput/attacks were still independently assembled before drafting, so case-to-attack provenance was not bound at the M8 run boundary
3. original baseline outcomes were not bound, so a substituted old evaluator could redefine which attacks were historically caught/survived
4. the public `improvement` field no longer had a normative formula

These are valid architecture findings. Revision 3 treats them as one missing concept rather than four local patches: **a self-contained M8 contract-attack experiment artifact**.

---

## 7. Decision: M8 Emits the Experiment Artifact

M10 implementation may add one result field to `runContractAttacks()`:

```text
experiment
```

This is additive. M8 attack generation, validation, evaluator behavior, ranking, and all existing public result fields remain unchanged.

The experiment is constructed inside the same successful M8 invocation from values M8 already owns:

```text
validated confirmed contract
canonical input
canonical expected output
complete retained generatedAttacks
original per-attack evaluator outcomes
ranked survivor order
top finding identity
```

This moves completeness/case/outcome binding to the correct authority boundary.

---

## 8. Experiment Artifact Invariants

Minimum conceptual shape:

```text
contract-attack-experiment v1
  contract
  case
    input
    expectedOutput
  attacks[]
  baseline
    outcomes[]
    survivorOrderIds[]
    topFindingId
```

Validation requires a bijection between attacks and outcomes:

```text
one attack ID <-> one baseline outcome
```

No omitted outcomes, no extra outcomes, no duplicate IDs.

The survivor order must equal exactly the survived ID set in deterministic original rank order, and `topFindingId` must equal the first survivor or null.

This gives M10 a self-contained structural experiment rather than a loose bag of caller-labelled pieces.

---

## 9. Threat/Claim Boundary of the Artifact

The artifact is a canonical structural binding, not cryptographic attestation.

It is intended to prevent:

- accidental slicing/subsetting
- stale outcome arrays
- mixing one case with another run's attacks
- verification-time experiment replacement
- ordinary serialized-data inconsistencies

It does not claim to prove historical authenticity against a caller who deliberately fabricates an entirely new self-consistent experiment object and presents it as old history.

That stronger provenance property would require a signing/attestation system and is outside M10 V1.

---

## 10. Revised Draft Boundary

`draftContractProtection()` receives only:

```text
experiment
sourceAttackId
protection generator
```

It does not accept independent:

```text
contract
input
expectedOutput
attacks
baseline outcomes
finding payload
```

The source ID must resolve to an original survived attack in the bound experiment.

The draft snapshots and carries the experiment unchanged.

---

## 11. Revised Confirmation Artifact

Accepted/edited confirmation preserves:

```text
entire original M8 experiment
selected source attack ID/rule ID
confirmed rule snapshot
human-authorized protection intent
```

Only the protection statement may be edited in V1.

This makes the confirmed protection artifact self-contained for replay verification.

---

## 12. Revised Verification Boundary

`verifyContractProtection()` accepts only:

```js
{
  protection,
  evaluator,
  improvedEvaluator
}
```

It cannot accept replacement:

- contract
- input
- expected output
- attack set
- original outcomes
- source identity

All replay data comes from `protection.experiment`.

---

## 13. Decision: Original Baseline Outcomes Are Authority

A key Revision 3 correction is that the caller-supplied old evaluator is not historical authority.

The historical classifications are the outcomes produced and bound by the original M8 experiment.

At verification time, the supplied old evaluator is used only to prove that the current integration reproduces that history.

Therefore M10 first requires:

```text
baseline replay classifications == bound original classifications
baseline survivor order == bound original survivor order
baseline top finding == bound original top finding
```

If not, verification returns `baseline-mismatch` and stops before claiming remediation success.

This prevents a substituted/stale old evaluator from changing what counts as a pre-existing survivor or regression baseline.

---

## 14. Replay Architecture

M10 reconstructs a Gotcha-owned deterministic generator from the experiment's bound attacks and calls `runContractAttacks()` twice:

```text
BOUND EXPERIMENT + OLD EVALUATOR
BOUND EXPERIMENT + IMPROVED EVALUATOR
```

Replay mapping preserves generator-owned metadata while M8 re-derives severity from the confirmed contract rule.

No model call occurs during verification.

---

## 15. Why Reuse `runContractAttacks()`

Directly calling `engine.attack()` would bypass or duplicate M8 behavior around:

- positive control
- canonical AI-data boundary
- generator attack schema
- contract-derived severity
- evaluator snapshot semantics
- async/non-boolean evaluator rejection
- intrinsic restoration
- cross-realm compatibility

M10 therefore treats `runContractAttacks()` as the replay execution boundary and does not create a second evaluator-safety implementation.

---

## 16. Source-Finding Reproducibility and Closure

The source must be an original bound survivor.

Verification requires:

```text
bound original: source SURVIVED
baseline replay: source SURVIVED
after replay: source CAUGHT
```

If the baseline replay does not reproduce the original bound experiment, the correct state is `baseline-mismatch`.

If baseline identity passes but the source still survives after remediation, the fix is not verified.

---

## 17. Regression Detection

Because a whole improved evaluator is supplied, it may accidentally loosen an unrelated old check.

A regression is identity-based:

```text
baseline CAUGHT
after same attack SURVIVED
```

M10 reports all such IDs.

Because the baseline must first reproduce original M8 classifications, a caller cannot hide a historical catch by supplying a different old evaluator.

---

## 18. Positive Control

Both replays use the exact bound original `expectedOutput` through M8.

If the improved evaluator catches the selected bad output only by rejecting the known-good output too, verification fails.

No second positive-control implementation is needed.

---

## 19. Decision: Lock `improvement`

The public metric is descriptive only.

Normative definition:

```text
improvement = baseline survivor count - after survivor count
```

This is net survivor reduction.

Separate identity sets report:

```text
eliminatedAttackIds: baseline SURVIVED -> after CAUGHT
regressionAttackIds: baseline CAUGHT -> after SURVIVED
```

A positive improvement can coexist with a regression, so the metric never determines verification success by itself.

Any regression still forces `verificationPassed: false`.

---

## 20. Verification Success Gate

Success requires all of:

```text
confirmed/valid protection artifact
old evaluator positive control passes
baseline replay exactly matches original M8 outcomes/order/top finding
improved evaluator positive control passes
source is original/reproduced baseline survivor
source becomes caught after remediation
zero baseline-caught -> after-survived regressions
```

Unrelated survivors may remain.

---

## 21. Claim Boundary

Safe claim:

> On the exact M8-bound original case and complete retained validated attack set, the supplied baseline evaluator reproduced the original M8 classifications, and the supplied improved evaluator preserved the known-good output, caught the selected source finding, and introduced no replay-set regressions.

Unsafe claims:

- universal evaluator correctness
- semantic equivalence of code and natural-language protection
- production-model safety
- every future attack is covered
- no unseen regressions exist
- cryptographic proof that a hostile caller did not fabricate history

---

## 22. Recommended Public Surface

Exactly three new M10 APIs:

```text
draftContractProtection
confirmContractProtection
verifyContractProtection
```

M8 keeps the existing `runContractAttacks()` API and adds the experiment field to its successful result.

The phase split remains:

```text
M8 experiment evidence
AI proposal
human authority
software implementation
deterministic verification
```

---

## 23. Preferred Implementation Files

M10 core:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
```

Additive M8 artifact emission:

```text
src/contract-attacks.js
```

After core validation:

```text
examples/contract-remediation.js
README.md
package.json
public/package consumer tests
```

Default no-change surfaces:

```text
src/engine.js
src/mutation-pack.js
```

---

## 24. Implementation Risk Register

### Risk: caller supplies only a subset of attacks

Mitigation: M10 does not accept a bare attack array; it consumes the self-contained M8 experiment and validates attack/outcome/survivor-order completeness as one unit.

### Risk: different case paired with original attacks

Mitigation: case and attacks are bound inside the same M8 invocation; M10 accepts no independent case fields.

### Risk: different contract changes authority

Mitigation: confirmed contract is bound inside the M8 experiment and replayed unchanged.

### Risk: stale/substituted baseline evaluator rewrites history

Mitigation: original M8 outcomes/order/top finding are bound; baseline replay must match them exactly before comparison.

### Risk: AI remediation becomes executable policy

Mitigation: declarative schema only + mandatory human confirmation + caller-owned evaluator code.

### Risk: one fix breaks another attack

Mitigation: identity-level caught->survived regression detection over the complete bound set.

### Risk: metric hides a regression

Mitigation: improvement is only net survivor-count delta; regression IDs are independent and any regression fails verification.

### Risk: exact-output overfit

Mitigation: generator instructions require narrow rule-level intent; docs avoid generalization claims.

### Risk: duplicated M8 safety logic

Mitigation: replay through existing `runContractAttacks()` boundary.

### Risk: architecture expands into provenance security

Mitigation: explicitly state that structural canonical binding is not cryptographic attestation against a deliberately fabricated historical artifact.

---

## 25. Architecture Decision Record

**A.** No AI-generated executable evaluator code.

**B.** Human confirmation required before verification.

**C.** Caller supplies the real improved evaluator.

**D.** M8 emits a self-contained experiment artifact from the same successful run that owns contract/case/attacks/outcomes.

**E.** M10 drafting consumes that experiment rather than independently assembled contract/case/attack inputs.

**F.** Confirmed remediation carries the complete experiment unchanged.

**G.** Verification accepts no substitute experiment data.

**H.** Original M8 baseline outcomes/order/top finding are historical authority; the supplied old evaluator must reproduce them exactly.

**I.** Replay exact bound candidates through `runContractAttacks()` old vs improved.

**J.** Severity remains confirmed-contract authority.

**K.** Success requires positive controls + baseline identity + source closure + zero identity-level regressions.

**L.** `improvement = baseline survivors - after survivors`; metric does not override correctness gates.

**M.** `src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

**N.** Structural experiment binding is not a claim of cryptographic historical attestation.

---

## 26. Audit Conclusion

The smallest coherent Revision 3 architecture is:

```text
RUN M8 ONCE
  ↓
M8 BINDS CONTRACT + CASE + COMPLETE ATTACKS + ORIGINAL OUTCOMES
  ↓
SELF-CONTAINED CONTRACT-ATTACK EXPERIMENT
  ↓
AI DRAFTS DECLARATIVE PROTECTION INTENT
  ↓
HUMAN CONFIRMATION
  ↓
CALLER IMPLEMENTS IMPROVED EVALUATOR
  ↓
REPLAY OLD EVALUATOR
  ↓
REQUIRE EXACT ORIGINAL BASELINE IDENTITY
  ↓
REPLAY IMPROVED EVALUATOR
  ↓
POSITIVE CONTROL + SOURCE CLOSURE + IDENTITY REGRESSION CHECK
```

This closes the experiment-authority gaps identified across both Codex architecture reviews without weakening the M8 data/code boundary or turning M10 into a provenance-attestation system.
