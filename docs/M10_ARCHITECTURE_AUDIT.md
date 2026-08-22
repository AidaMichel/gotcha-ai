# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 2
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest safe architecture that can move the confirmed-contract path from `GOTCHA` to measurable remediation without weakening M8's data/code boundary or allowing verification to change the original experiment?

---

## 2. Current Repository Facts

### Deterministic Mutation Pack path

`src/mutation-pack.js` requires developer-authored trusted executable `protection.check()` callbacks. `src/engine.js#runImprovementLoop()` can therefore compose that trusted check with the evaluator and re-attack.

### Confirmed-contract path

`src/contract-attacks.js` deliberately compiles model-produced attacks as declarative data only. Generated attacks contain identity, rule attribution, candidate output, and ranking metadata, but no executable `protectionCheck`.

`runContractAttacks()` already owns the important hardened execution boundary: contract validation, AI-safe data snapshots, positive control, generated-attack validation, contract-derived severity, evaluator execution, ranking, callback restoration, and supported cross-realm evaluator semantics.

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

Only the protection statement is editable in V1. Contract/case/attack provenance remains immutable.

---

## 5. Decision: Verify the Actual Improved Evaluator

M10 verifies a full caller-supplied `improvedEvaluator`, not a temporary Gotcha wrapper around `evaluator + protectionCheck`.

Reasons:

- a real evaluator change may update parsers, thresholds, rules, or structure
- the verification should exercise the actual intended post-change behavior
- old and improved evaluators can each run independently through the established M8 evaluator boundary
- Gotcha does not need to own executable remediation composition

---

## 6. Codex Architecture Review Findings Incorporated

Exact-head architecture review on the original revision identified two valid binding flaws.

### Finding A — complete attack set was not bound

Original draft proposed accepting `attacks` again at verification time. That could allow a subset or substituted payload to hide regressions while still returning success.

**Revision 2 decision:** the complete original validated `generatedAttacks` set is supplied at drafting time and carried immutably through draft -> confirmed protection. Verification accepts no attack-set argument.

### Finding B — original eval case was not bound

Original draft proposed accepting `input` and `expectedOutput` again at verification time. That could switch verification to a different case from the one used to choose the remediation.

**Revision 2 decision:** canonical original `input` + `expectedOutput` snapshots are carried through draft -> confirmed protection. Verification accepts no replacement case arguments.

These findings also led to one further simplification: the confirmed Quality Contract itself is carried in the remediation artifact, so verification does not accept a replacement contract either.

---

## 7. Revised Draft Boundary

`draftContractProtection()` now receives:

```text
contract
input
expectedOutput
complete generatedAttacks set
sourceAttackId
protection generator
```

The source finding is resolved from the complete attack set by ID. There is no separate caller-supplied `finding` payload that could disagree with the replay set.

The draft binds canonical snapshots of:

```text
contract
case
complete attack set
source identity
rule authority
protection proposal
```

---

## 8. Revised Confirmation Artifact

Accepted/edited confirmation preserves the entire bound experiment:

```text
confirmed contract
original input
original expected output
complete original generated attack set
selected source attack ID/rule ID
confirmed rule snapshot
confirmed human-authorized protection intent
```

This makes the protection artifact self-contained for deterministic verification.

The artifact is structurally/canonically bound, consistent with Gotcha's existing serialized-data authority model. M10 does not claim cryptographic signatures against a caller deliberately reconstructing a different valid object.

---

## 9. Revised Verification Boundary

`verifyContractProtection()` accepts only:

```js
{
  protection,
  evaluator,
  improvedEvaluator
}
```

It cannot silently change:

- contract
- input
- expected output
- replay attack set
- source attack identity

because those values come only from the confirmed artifact.

This is stronger and simpler than accepting duplicates and comparing them later.

---

## 10. Replay Architecture

M10 reconstructs a Gotcha-owned deterministic generator from the bound attack set and calls `runContractAttacks()` twice:

```text
BOUND EXPERIMENT + OLD EVALUATOR
BOUND EXPERIMENT + IMPROVED EVALUATOR
```

Replay mapping preserves generator-owned metadata while allowing M8 to re-derive severity from the authoritative bound contract rule.

No model call occurs during verification.

---

## 11. Why Reuse `runContractAttacks()`

Directly calling `engine.attack()` would bypass or duplicate M8 behavior around:

- positive control
- canonical AI-data boundary
- generator attack schema
- contract-derived severity
- evaluator snapshot semantics
- async/non-boolean evaluator rejection
- intrinsic restoration
- cross-realm compatibility

The audit therefore treats `runContractAttacks()` as the correct contract-attack replay execution boundary.

M10 should not create a second evaluator safety implementation.

---

## 12. Source-Finding Reproducibility

Historical `survived: true` metadata is not trusted.

Verification recomputes the baseline on the exact bound experiment.

The source finding counts as remediated only when:

```text
baseline: source SURVIVED
after:    source CAUGHT
```

If baseline no longer reproduces it, report `source-finding-not-reproducible` rather than synthetic success.

---

## 13. Regression Detection

Because a whole improved evaluator is supplied, it may accidentally loosen an unrelated old check.

A regression is identity-based:

```text
baseline attack = CAUGHT
after same attack = SURVIVED
```

M10 must report all such attack IDs.

Survivor-count reduction alone is not enough.

---

## 14. Positive Control

Both old and improved evaluator runs use the same bound original `expectedOutput` through M8.

If the improved evaluator catches the selected bad output only by rejecting the known-good output too, M10 verification fails.

No second positive-control implementation is needed.

---

## 15. Claim Boundary

M10 can prove observable behavior only on the exact bound replay experiment.

Safe claim:

> The supplied improved evaluator preserved the bound known-good output, caught the selected bound source finding, and introduced no regressions on the complete bound replay set.

Unsafe claims:

- universal evaluator correctness
- semantic equivalence of code and natural-language protection
- production-model safety
- every future attack is covered
- no unseen regressions exist

---

## 16. Recommended Public Surface

Exactly three APIs:

```text
draftContractProtection
confirmContractProtection
verifyContractProtection
```

The split reflects three real phases:

```text
AI proposal
human authority
software implementation + deterministic verification
```

A single synchronous remediation-loop function cannot honestly span the human/software-development handoff.

---

## 17. Preferred Implementation Files

Core:

```text
src/contract-remediation.js
src/index.js
test/contract-remediation.test.js
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

Prefer consuming `runContractAttacks()` unchanged.

---

## 18. Implementation Risk Register

### Risk: partial attack set hides regressions

Mitigation: complete original set bound at draft time; no verification-time attack input.

### Risk: different case produces misleading success

Mitigation: input/expectedOutput bound at draft time; no verification-time case input.

### Risk: different contract changes authority

Mitigation: confirmed contract bound into remediation artifact.

### Risk: AI remediation becomes executable policy

Mitigation: declarative schema only + mandatory human confirmation + caller-owned evaluator code.

### Risk: stale finding metadata

Mitigation: baseline is always replayed.

### Risk: one fix breaks another attack

Mitigation: identity-level caught->survived regression detection over complete bound set.

### Risk: exact-output overfit

Mitigation: generator instructions require narrow rule-level intent; docs still avoid generalization claims.

### Risk: duplicated M8 safety logic

Mitigation: replay through existing `runContractAttacks()` boundary.

---

## 19. Architecture Decision Record

**A.** No AI-generated executable evaluator code.

**B.** Human confirmation required before verification.

**C.** Caller supplies real improved evaluator.

**D.** Full original contract + case + attack set bound into remediation artifact.

**E.** Verification takes no substitute experiment inputs.

**F.** Replay exact bound candidates through `runContractAttacks()` old vs improved.

**G.** Severity remains confirmed-contract authority.

**H.** Success requires positive control + source reproducibility/closure + zero identity-level replay regressions.

**I.** No engine/mutation-pack redesign by default.

---

## 20. Audit Conclusion

The revised smallest coherent M10 architecture is:

```text
COMPLETE ORIGINAL M8 EXPERIMENT
  ↓
BOUND DECLARATIVE PROTECTION DRAFT
  ↓
HUMAN CONFIRMATION
  ↓
SELF-CONTAINED CONFIRMED REMEDIATION ARTIFACT
  ↓
CALLER-SUPPLIED IMPROVED EVALUATOR
  ↓
REPLAY EXACT BOUND EXPERIMENT — OLD
  ↓
REPLAY EXACT BOUND EXPERIMENT — IMPROVED
  ↓
POSITIVE CONTROL + SOURCE CLOSURE + IDENTITY-LEVEL REGRESSION CHECK
```

This closes the loop without weakening M8 and removes the two experiment-rebinding flaws identified in the pre-implementation adversarial review.
