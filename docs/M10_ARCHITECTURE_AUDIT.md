# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 13
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit Question

What is the smallest deterministic architecture that can turn a confirmed M8 survivor into a human-authorized declarative protection and then prove an externally supplied improved evaluator against the exact bound experiment without serialization drift, callback mutation, authority aliasing, human-confirmation bypass, or implementation-dependent public control flow?

## 2. Revision 13 Principle

Revision 13 is a narrow closure pass over the five exact-head Revision 12 findings.

It retains the closed Revision 12 boundary model and adds five explicit rules:

- one signed-zero-safe numeric primitive for every serialized non-literal numeric field;
- draft-only confirmation authority;
- a wire probe with one full protection-artifact wrapper level of nesting headroom;
- one Promise-only completion contract for every public M10 API;
- one trim-based non-empty-string predicate used everywhere.

## 3. Closure of Revision 12 Findings

### 3.1 Signed zero is forbidden in every serialized numeric authority field

`isWireNumberV1(value)` requires a finite number and `Object.is(value, -0) === false`.

This primitive now applies not only to case/output values but also to `realism`, `subtlety`, `novelty`, `fixability`, and any other non-literal serialized numeric field. Ordinary positive zero remains valid.

### 3.2 Human confirmation cannot be bypassed or replayed

`draftContractProtection()` resolves only a `status: "draft"` artifact.

`confirmContractProtection()` accepts only `status: "draft"`. Passing a confirmed or rejected artifact rejects with `TypeError`.

Decision mapping remains exact:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only confirmed artifacts.

### 3.3 Wire depth is tested at protection-artifact depth

M8 no longer probes only the experiment itself.

It serializes this exact depth envelope:

```js
{ experiment: completeCandidateExperiment }
```

A real contract-protection artifact adds sibling fields but no deeper path beneath `experiment`, so this envelope reserves the one additional wrapper level required by the later serialized/reloaded draft/confirmed/rejected artifact flow.

The inherited `Object.prototype.toJSON` / `Array.prototype.toJSON` hardening remains mandatory before the probe.

### 3.4 Public completion semantics are exact

All three public APIs always return a genuine local native Promise before validation or callback execution.

Boundary validation rejects that Promise with `TypeError`; there is no direct return or synchronous validation-throw channel.

Draft generator throws/rejections reject through the Promise. Classified evaluator failures remain semantic verification results and resolve rather than reject.

This gives callers one control-flow model regardless of whether the injected generator is synchronous or asynchronous.

### 3.5 Non-empty strings have one meaning

`isNonEmptyStringV1(value)` is exactly:

```text
typeof value === "string" AND value.trim().length > 0
```

Whitespace-only values reject. Accepted strings are not silently trimmed or normalized after validation.

The same rule applies to tasks, IDs, statements, descriptions, rationales, types, and protection text.

## 4. Authority Chain

The required authority chain is now:

```text
validated M8 case before callbacks
  -> owned case snapshots + frozen eligibility
  -> retained attack output/score snapshots
  -> complete candidate experiment
  -> one-level protection-depth JSON wire probe
  -> emitted experiment
  -> public drafting Promise
  -> pre-generator experimentAuthority snapshot
  -> separately owned generatorInput snapshot
  -> status:draft artifact
  -> public confirmation Promise
  -> confirmed/rejected independently owned artifact
  -> public verification Promise
  -> pre-baseline verificationAuthority snapshot
  -> baseline replay
  -> historical identity gate
  -> improved replay
  -> independently owned normalized result
```

No callback may mutate authority that a later phase reads, and no artifact may become verification authority without an explicit draft confirmation decision.

## 5. Replayability Boundary

Replayable V1 supports only local JSON-wire-stable evaluator values:

- null/string/boolean;
- finite numbers except negative zero;
- dense local Arrays;
- local ordinary Objects with `Object.prototype`;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no repeated identity or cycles;
- no exotics or non-finite numbers.

Every serialized attack score also rejects signed zero independently of the recursive case/output predicate.

The decisive wire test is the protection-depth envelope round trip, guarded against inherited `toJSON` execution.

## 6. Public API Contract

The public operations are uniformly Promise-based:

```text
draftContractProtection -> Promise<draft artifact>
confirmContractProtection -> Promise<confirmed|rejected artifact>
verifyContractProtection -> Promise<verification result>
```

Malformed boundaries reject with `TypeError` and execute zero callbacks.

Generator callback errors reject drafting. Evaluator execution failures that have defined semantic states resolve verification with those states.

## 7. Historical Identity and Ranking

The baseline evaluator remains only a compatibility witness. Bound experiment history remains authority.

A complete baseline replay must reproduce:

- every per-attack classification in bound attack order;
- survivor rank order;
- top finding.

Attack numeric severity remains exactly bound to rule severity:

```text
critical -> 1.0
major    -> 0.7
minor    -> 0.4
```

Experiment baseline outcomes remain in exact bound attack order.

## 8. Result Semantics

Partial verification states remain exact and complete. Complete state precedence remains:

```text
regression-detected
source-finding-still-survives
verified
```

`failureReasons` reports all simultaneously applicable complete failures in canonical order.

`sourceFindingCaught` reflects only the selected source's after classification and may be true while verification fails because of another regression.

## 9. Required Proof Obligations

Implementation must prove at least:

- whitespace-only required strings reject consistently;
- accepted strings are preserved without silent trimming;
- `-0` rejects in case/output values and all attack score fields while `0` remains valid;
- a candidate that serializes as an experiment but fails when wrapped as `{ experiment }` is non-replayable;
- inherited prototype `toJSON` is never executed by the probe;
- every public API immediately returns a genuine native Promise;
- malformed calls reject asynchronously with `TypeError` and execute zero callbacks;
- generator throw/rejection uses the Promise rejection channel;
- evaluator execution failures resolve the required semantic states;
- drafting can resolve only a draft artifact;
- confirmation accepts only a draft and cannot reconfirm confirmed/rejected artifacts;
- accept/edit/reject map to exact terminal statuses;
- generator input shares no mutable references with experiment authority;
- numeric attack severity and baseline outcome ordering remain exact;
- pre-callback case capture, confirmation ownership, and pre-baseline verification snapshot remain intact;
- baseline-before-improved ordering and exact historical identity remain intact.

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

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 13 spec.