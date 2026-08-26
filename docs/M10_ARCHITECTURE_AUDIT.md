# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 12
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest deterministic architecture that can turn a confirmed M8 survivor into a human-authorized declarative protection and then prove an externally supplied improved evaluator against the exact bound experiment without allowing serialization drift, callback mutation, authority aliasing, or implementation-dependent public results?

## 2. Revision 12 Principle

Revision 12 keeps Revision 11's closed boundary model and closes the seven remaining exact-head findings without expanding scope.

The normative primitives remain:

- exact schema records;
- exact dense schema arrays;
- accepted callbacks;
- wire-replayable evaluator values;
- deep independent ownership.

Revision 12 tightens numeric wire semantics, generator-input ownership, ranking authority, JSON probe safety, confirmation status, complete failure-reason membership, and historical outcome ordering.

## 3. Closure of Revision 11 Findings

### 3.1 Negative zero is non-replayable

Finite-number eligibility now explicitly rejects `-0` using `Object.is(value, -0)`.

This prevents JSON's `-0 -> 0` normalization from changing evaluator-observable semantics for callbacks that distinguish signed zero.

### 3.2 Generator input is fully isolated

`draftContractProtection()` first creates `experimentAuthority`, then creates a second independently owned `generatorInput` snapshot.

Every mutable generator-input member—`contract`, `input`, `expectedOutput`, and `finding`—is independent from `experimentAuthority`. Generator mutation cannot alter authority later embedded in the draft.

### 3.3 Numeric attack severity is authority-bound

Stored attack severity is exactly derived from rule severity:

```text
critical -> 1.0
major    -> 0.7
minor    -> 0.4
```

An altered but in-range numeric severity is invalid. This keeps serialized historical ranking authority aligned with M8 replay, which recomputes severity from the rule.

### 3.4 JSON wire probe blocks inherited `toJSON`

Immediately before the complete-experiment wire probe, M8 requires both local `Object.prototype` and `Array.prototype` to have no own `toJSON` property.

If either surface is contaminated, the experiment is classified non-replayable and `JSON.stringify` is not invoked. This prevents inherited user code from executing inside the supposedly data-only wire probe.

### 3.5 Confirmation decision status is exact

Decision mapping is now normative:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Confirmation never returns `draft`. Rejected artifacts cannot verify.

### 3.6 Complete failure reasons report all applicable facts

State precedence remains regression before source survival, but `failureReasons` now independently contains every applicable complete-replay failure in canonical order.

When both are true the exact array is:

```text
["regression-detected", "source-finding-still-survives"]
```

### 3.7 Bound outcomes use bound attack order

`experiment.baseline.outcomes[i].attackId` must equal `experiment.attacks[i].id`.

The serialized historical experiment therefore has one exact outcome order, matching normalized replay output and eliminating permutation ambiguity.

## 4. Authority Chain

The required authority chain is:

```text
validated M8 case before callbacks
  -> owned case snapshots + frozen eligibility
  -> retained attack output snapshots
  -> complete candidate experiment
  -> hardened whole-experiment JSON wire probe
  -> emitted experiment
  -> pre-generator experimentAuthority snapshot
  -> separately owned generatorInput snapshot
  -> independently owned draft
  -> independently owned confirmed/rejected artifact
  -> pre-baseline verificationAuthority snapshot
  -> baseline replay
  -> historical identity gate
  -> improved replay
  -> independently owned normalized result
```

No callback may mutate authority that a later phase reads.

## 5. Replayability Boundary

Replayable V1 supports only local JSON-wire-stable evaluator values:

- null/string/boolean;
- finite numbers except negative zero;
- dense local Arrays;
- local ordinary Objects with `Object.prototype`;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no repeated identity or cycles;
- no exotics or non-finite numbers.

The decisive wire test is the complete candidate experiment round trip, guarded against inherited `toJSON` execution.

## 6. Historical Identity and Ranking

The baseline evaluator is only a compatibility witness. Bound experiment history remains authority.

A complete baseline replay must reproduce:

- every per-attack classification in bound attack order;
- survivor rank order;
- top finding.

Attack numeric severity is bound to rule severity, so the serialized historical record cannot claim ranking inputs that replay would recompute differently.

`baselineMismatchAttackIds` contains exactly classification-different attacks in bound order. A ranking/top-finding-only mismatch still returns `baseline-mismatch` with `[]` mismatch IDs.

## 7. Confirmation and Verification Results

Accept/edit create confirmed artifacts; reject creates a rejected artifact. All outputs are deeply independently owned.

Partial verification states remain exact and complete. Complete state precedence is:

```text
regression-detected
source-finding-still-survives
verified
```

`failureReasons` is not a synonym for state: it reports all simultaneously applicable complete failures in canonical precedence order.

`sourceFindingCaught` reflects only the selected source's after classification and may be `true` while verification fails because of another regression.

## 8. Required Proof Obligations

Implementation must prove at least:

- `-0` is non-replayable;
- inherited prototype `toJSON` is never executed by the wire probe;
- generator input shares no mutable references with experiment authority;
- generator mutation of contract/input/expectedOutput/finding cannot alter draft authority;
- numeric severity exactly matches the rule-severity mapping;
- experiment baseline outcomes reject any order other than bound attack order;
- accept/edit/reject map to exact statuses;
- simultaneous regression + source survival emits both exact failure reasons in order;
- whole-experiment wire round-trip gating remains required;
- pre-callback case capture, pre-generator authority snapshot, confirmation ownership, and pre-baseline verification snapshot remain intact;
- baseline-before-improved ordering and exact historical identity remain intact.

## 9. Scope

Expected implementation files:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

Lossless graph/prototype serialization, cryptographic attestation, provider adapters, dashboards, model execution, generated evaluator code, automatic patching, and unrelated engine redesign remain out of scope.

## 10. Stopping Rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 12 spec.
