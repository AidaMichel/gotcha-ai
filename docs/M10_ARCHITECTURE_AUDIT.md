# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 14
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit question

What is the smallest deterministic architecture that can turn one confirmed M8 survivor into a human-authorized declarative protection and verify an externally supplied improved evaluator against the exact bound experiment without serialization drift, alias drift, callback prototype mutation, post-call authority races, confirmation bypass, or implementation-dependent result states?

## 2. Revision 14 principle

Revision 14 closes the five exact-head Revision 13 findings with five shared rules rather than local exceptions:

- the complete experiment is a tree, not merely a set of individually replayable values;
- generator callbacks receive data in a fresh dedicated prototype realm that cannot mutate Gotcha authority prototypes;
- every evaluator phase/reason pair has one exact semantic result state;
- public option graphs and callback identities become authoritative at invocation time through side-effect-free descriptor capture;
- every completed draft/confirmed/rejected artifact is wire-probed after final protection text is known.

All Revision 13 signed-zero, draft-only confirmation, Promise-only public completion, non-empty-string, ownership, replay-ordering, severity, baseline-identity, and failure-reason rules remain locked.

## 3. Closure of Revision 13 findings

### 3.1 Cross-field identity cannot drift through JSON

Revision 13 rejected repeated identity only inside each recursive case/output value. Revision 14 adds `isTreeGraphV1(root)`, which uses one identity set across the complete replayable experiment graph.

No Object/Array identity may occur at two paths anywhere in the experiment. This includes aliases between input and expected output, between different attack outputs, between contract/rule containers and attack-rule containers, or across any other schema fields.

Because accepted experiments are trees, JSON serialization cannot silently de-alias an accepted authority relationship.

### 3.2 Generator prototype mutation cannot reach authority

Data-reference isolation alone is insufficient because ordinary local Objects and Arrays share local prototypes.

Revision 14 therefore requires one fresh dedicated callback realm per drafting invocation. Every Object/Array reachable from generator input belongs to that realm. Its Object/Array prototypes are not reference-identical to Gotcha authority prototypes or any prototype reachable from `experimentAuthority`.

A generator may mutate its callback realm, including its Object/Array prototypes, without changing authority, artifact serialization behavior, or another drafting invocation. The realm is discarded when generator completion settles.

### 3.3 Evaluator failure mapping is total

The stable M8 classification is now mapped exhaustively.

For either evaluator:

```text
positive-control + returned-false -> positive-control-failed
positive-control + threw          -> execution-failed
positive-control + non-boolean    -> execution-failed
attack-evaluation + threw         -> execution-failed
attack-evaluation + non-boolean   -> execution-failed
```

The baseline/improved prefix selects the exact public state. Positive-control pass facts are `null` when the failure occurs before a valid `true`, and remain `true` when attack evaluation fails after the control passed.

### 3.4 Public-call authority is fixed at invocation

All public M10 APIs still return a native Promise and expose no synchronous validation-error channel.

Before that Promise is returned, a side-effect-free descriptor capture copies the complete options data graph and captures callback identities by value. Proxies are identified with the captured side-effect-free Proxy probe before reflective traversal, and accessors are never invoked.

Capture failure is stored internally and converted to asynchronous `TypeError` rejection in the Promise continuation. Caller mutation immediately after the API call cannot replace or alter the experiment, draft, protection, decision, or callback authority for that invocation.

### 3.5 Final artifact size/escaping is actually tested

The M8 experiment probe remains necessary but is no longer treated as proof that later user/model text is serializable.

Every draft, confirmed artifact, and rejected artifact is stringified/parsed after its final status and protection text are known. The inherited `Object.prototype.toJSON` / `Array.prototype.toJSON` hardening is repeated before each completed-artifact probe.

If final text, escaping, nesting, or runtime maximum string size makes serialization fail, drafting/confirmation rejects with `TypeError`; no unserializable artifact is returned.

## 4. Authority chain

The final V1 authority chain is:

```text
validated M8 case before callbacks
  -> frozen case eligibility + owned case snapshots
  -> retained attack/output snapshots
  -> complete tree candidate experiment
  -> experiment wire probe
  -> emitted replayable experiment
  -> invocation-time drafting capture
  -> owned experimentAuthority
  -> isolated callback-realm generator input
  -> validated generator output
  -> completed draft artifact wire probe
  -> invocation-time confirmation capture
  -> completed confirmed/rejected artifact wire probe
  -> invocation-time verification capture
  -> owned verificationAuthority
  -> baseline replay
  -> exact historical identity gate
  -> improved replay
  -> normalized deterministic result
```

No later phase reads mutable caller authority and no generator callback can mutate authority through either own references or shared prototypes.

## 5. Replayability boundary

Replayable V1 remains intentionally narrow:

- null/string/boolean;
- finite numbers except `-0`;
- dense local Arrays;
- local ordinary Objects;
- no accessors, symbols, exotic/custom/null/cross-realm prototypes;
- no cycles;
- no repeated identity anywhere in the complete experiment tree;
- no non-finite numeric authority;
- exact signed-zero-safe attack scores.

The replayable experiment must survive the hardened JSON round trip and revalidate as the same tree-shaped authority.

## 6. Public completion and authority model

The public operations remain uniformly Promise-based:

```text
draftContractProtection -> Promise<draft artifact>
confirmContractProtection -> Promise<confirmed|rejected artifact>
verifyContractProtection -> Promise<verification result>
```

Invocation capture is synchronous but non-callback/non-throwing to the caller; validation failures reject asynchronously.

Generator throws/rejections reject drafting. Classified evaluator failures resolve semantic verification results.

## 7. Human authority

Drafting can produce only `status: "draft"`.

Confirmation accepts only a draft. Exact terminal mapping remains:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only confirmed artifacts. Every confirmation output is independently owned and wire-safe before it is returned.

## 8. Historical identity and result semantics

The old evaluator is a compatibility witness; bound experiment history remains authority.

Baseline must reproduce per-attack classifications, survivor rank order, and top finding before improved evaluation starts.

Attack numeric severity remains bound exactly to rule severity. Baseline and normalized replay outcomes remain in bound attack order.

Complete-state precedence remains:

```text
regression-detected
source-finding-still-survives
verified
```

`failureReasons` reports all simultaneously applicable complete failures in canonical order. `sourceFindingCaught` reflects only the selected source's after classification.

## 9. Required proof obligations

Implementation must prove at least:

- aliases across any two experiment paths reject, including input↔expectedOutput aliases;
- accepted experiments remain semantically identical after JSON reload because they are trees;
- generator input Objects/Arrays and their mutable prototypes are isolated from authority in a fresh per-invocation realm;
- generator prototype mutation cannot affect authority, later wire probes, or another invocation;
- public invocation capture freezes nested option data and callback identity before Promise return without invoking getters/Proxy traps;
- immediate caller mutation after API return cannot alter that invocation;
- capture/validation failures still reject asynchronously with `TypeError`;
- every evaluator phase/reason pair maps to the exact required state and positive-control fact;
- every completed draft/confirmed/rejected artifact is probed after final protection text is known;
- huge or escape-heavy generator/edit text cannot produce an unserializable returned artifact;
- inherited local `toJSON` never executes in any wire probe;
- signed-zero, severity, baseline ordering, draft-only confirmation, baseline identity, and complete failure-reason rules remain intact.

## 10. Scope

Expected implementation files:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

A small isolated-realm helper under `src/` is allowed. `src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

Lossless arbitrary graph/prototype serialization, cryptographic attestation, provider adapters, dashboards, model execution, generated evaluator code, automatic patching, and unrelated engine redesign remain out of scope.

## 11. Stopping rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 14 spec.