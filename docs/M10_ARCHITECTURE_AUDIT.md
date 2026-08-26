# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 11
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest deterministic architecture that can turn a confirmed M8 survivor into a human-authorized declarative protection and then prove an externally supplied improved evaluator against the exact bound experiment without allowing artifact mutation, replay drift, or implementation-dependent public results?

## 2. Revision 11 Principle

Revision 11 replaces accumulated edge-case prose with a closed normative boundary model.

The architecture now has explicit reusable primitives for:

- exact schema records;
- exact dense schema arrays;
- accepted callbacks;
- wire-replayable evaluator values;
- deep independent ownership.

Every public and nested boundary is defined through these primitives rather than ad hoc local wording.

## 3. Closure of Revision 10 Findings

### 3.1 Full-artifact serialization probe

Replayability no longer depends on stringifying bare case or attack values only.

M8 constructs the complete replayable-candidate experiment and requires captured `JSON.stringify` + `JSON.parse` of that complete wrapper to succeed and revalidate. Runtime nesting failures introduced by artifact wrapper depth therefore produce the required non-replayable variant.

### 3.2 Exact schema-array primitive

`isExactArrayV1` now applies to every schema array, including contract rules, attacks, outcomes, survivor IDs, mismatch IDs, eliminated IDs, regression IDs, and failure reasons.

It fixes prototype, Proxy, holes, symbols, descriptors, and extra-key behavior.

### 3.3 Literal generator instruction

The normative V1 instruction string is embedded literally in the spec. Implementations cannot substitute prompt variants while claiming the same boundary behavior.

### 3.4 Draft authority before generator

`draftContractProtection()` now creates an independently owned `experimentAuthority` after full validation and before generator invocation.

Generator input and final draft are both derived only from that snapshot. Generator closures, async delay, or caller mutation cannot alter what the human later confirms.

### 3.5 Exact contract and rule records

The embedded contract is now exactly `{ version, status, task, rules }`, and every rule exactly `{ id, statement, kind, severity }` with locked value constraints.

This removes disagreement between “M8 normalizer silently drops extras” and “M10 exact container rejects extras.” M10 rejects extras deterministically.

### 3.6 Pre-callback M8 eligibility capture

Case replay eligibility and independently owned case snapshots are captured before the first evaluator/generator callback.

Retained attack outputs are snapshotted when retained, before attack-evaluator callbacks can create later artifact drift.

### 3.7 Exact partial state strings

All five partial verification states explicitly assign `state`, the uniform complete field set, null/false/empty-array facts, and failure reason values.

No result field is omitted and `undefined` is never a public semantic value.

## 4. Authority Chain

The required authority chain is now:

```text
validated M8 input/expected output before callbacks
  -> owned case snapshots + frozen case eligibility
  -> retained attack output snapshots
  -> complete candidate experiment
  -> whole-experiment JSON wire probe
  -> emitted experiment
  -> pre-generator experimentAuthority snapshot
  -> generator input
  -> independently owned draft
  -> independently owned confirmed/rejected artifact
  -> pre-baseline verificationAuthority snapshot
  -> baseline replay
  -> historical identity gate
  -> improved replay
  -> independently owned normalized result
```

No callback may mutate authority that a later phase reads from a caller-owned object.

## 5. Callback Boundary

The accepted callback set is exact and shared across generator/evaluator/improvedEvaluator:

```text
typeof value === "function" AND value is not a Proxy
```

There is no realm or function-kind restriction. Ordinary, bound, native, async, and cross-realm non-Proxy functions are accepted.

Generator completion remains direct value or genuine native Promise only. Arbitrary thenables are never assimilated.

## 6. Replayability Boundary

Replayable V1 intentionally supports only local JSON-stable evaluator values:

- null/string/boolean/finite number;
- dense local Arrays;
- local ordinary Objects with `Object.prototype`;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no repeated identity or cycles;
- no exotics or non-finite numbers.

The decisive wire test is the complete candidate experiment round trip, not only nested value probes.

## 7. Historical Identity and Results

The baseline evaluator is a compatibility witness only. Bound experiment history remains authority.

A completed baseline replay must reproduce:

- every attack classification;
- survivor order;
- top finding.

`baselineMismatchAttackIds` contains exactly classification-different attacks in bound attack order. A ranking/top-finding-only mismatch has an empty mismatch-ID array while still returning `baseline-mismatch`.

Normalized replay payloads expose only exact outcomes, survivor IDs, and top finding ID—not the full mutable M8 result graph.

## 8. Verification Failure Semantics

Partial states are exactly:

```text
baseline-positive-control-failed
baseline-execution-failed
baseline-mismatch
improved-positive-control-failed
improved-execution-failed
```

Complete states are exactly:

```text
regression-detected
source-finding-still-survives
verified
```

Regression precedence is higher than source-survival failure. `sourceFindingCaught` reflects only the selected source's complete after classification and can therefore be true while verification fails because of another regression.

## 9. Implementation Proof Obligations

Implementation must demonstrate:

- zero callbacks on malformed option/container boundaries;
- exact array rejection for holes, Proxies, symbols, exotic prototypes, and extra properties;
- whole-experiment JSON round-trip gating;
- pre-callback case eligibility capture;
- pre-generator experiment snapshotting;
- deep draft/confirmation ownership;
- pre-baseline verification snapshotting;
- exact callback acceptance behavior;
- exact historical mismatch membership and ordering;
- exact partial state/result serialization;
- stable baseline-before-improved ordering;
- no regression masked by positive improvement;
- no source-finding success masked or fabricated by overall state.

## 10. Scope

Expected implementation files:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

Lossless graph/prototype serialization, cryptographic attestation, provider adapters, dashboards, model execution, generated evaluator code, automatic patching, and unrelated engine redesign remain out of scope.

## 11. Stopping Rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 11 spec.
