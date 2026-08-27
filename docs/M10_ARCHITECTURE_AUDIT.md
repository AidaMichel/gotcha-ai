# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 19
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit question

What is the smallest deterministic architecture that can turn one confirmed M8 survivor into a human-authorized declarative protection and verify an externally supplied improved evaluator against the exact bound experiment without serialization drift, prototype ambiguity, identity normalization, post-call authority races, confirmation bypass, key-order drift, descriptor normalization, legacy-result aliasing, or implementation-dependent boundary behavior?

## 2. Revision 19 principle

Revision 19 keeps the trusted-core simplification introduced in Revision 16: M10 does not execute proposal/model callbacks. It closes the four unresolved Revision 18 P1 findings without widening architecture.

The four direct closures are:

1. every accepted and Gotcha-created public/schema record now has one exact observable property surface: extensible ordinary local record, canonical keys, and writable/enumerable/configurable `true` data properties;
2. schema-less evaluator-facing records and all accepted Arrays now also have exact ordinary mutable descriptor/extensibility surfaces, so direct snapshots and JSON reloads cannot disagree;
3. the V1 confirmed-contract rule limit is pinned to **7**, matching current M8 `const MAX_RULES = 7`;
4. normalized replay payloads now carry actual `survivorOrderIds`, with `topFindingId` exactly the first survivor or `null` when none survive.

No provider callback, global prototype guard, callback-realm projection, engine redesign, or new executable authority is introduced.

## 3. Exact public and schema record surfaces

Revision 18 fixed keys/prototypes but left writable/configurable attributes and extensibility implementation-dependent.

Revision 19 closes that boundary. Every accepted and Gotcha-created schema record must have:

```text
prototype = local Object.prototype
Object.isExtensible(record) = true
exact canonical own string keys only
for every schema property:
  writable = true
  enumerable = true
  configurable = true
```

Frozen, sealed, non-extensible, non-writable, non-configurable, accessor, symbolic, extra-key, Proxy, custom-prototype, cross-realm, or mandatory-forbidden-brand variants reject.

Gotcha normalization and deep snapshots construct exactly the same ordinary mutable surface. JSON-reloaded schema records must revalidate to that same surface.

This makes assignment, deletion, extension, and serialization/reload behavior deterministic across implementations.

## 4. Schema-less wire descriptors and Arrays

Schema-less evaluator-facing values must preserve key order because an evaluator can observe it, but Revision 18 did not fix property descriptors.

Revision 19 requires every accepted schema-less record to be extensible and every own string property to be an ordinary mutable data property:

```text
writable = true
enumerable = true
configurable = true
```

Those descriptors are recreated exactly during deep snapshot while preserving the captured key sequence. JSON reload must reproduce both order and descriptor surface.

Arrays now have the complete ordinary mutable surface fixed as well:

```text
Array is extensible
index 0..length-1 descriptors:
  writable = true
  enumerable = true
  configurable = true
length descriptor:
  writable = true
  enumerable = false
  configurable = false
  value = actual length
```

Therefore sealed/frozen/non-extensible Arrays, non-writable/non-configurable index properties, sparse Arrays, accessors, symbols, and extra named keys reject instead of being normalized differently by JSON.

## 5. Exact rule-count authority

The companion spec no longer references an undefined `MAX_RULES` choice.

Revision 19 pins:

```text
MAX_RULES_V1 = 7
```

The value is taken from current M8 `src/contract-attacks.js`, where `const MAX_RULES = 7` is the confirmed-contract validator limit.

A V1 confirmed contract therefore has exactly **1..7** active rules. Seven is accepted when all other constraints pass; eight rejects before replay/drafting. Implementations may not substitute configuration or a different runtime limit.

## 6. Exact completed replay summaries

Revision 18 accidentally displayed completed normalized replay payloads with literal empty survivor values while simultaneously requiring actual M8 rank data.

Revision 19 removes that contradiction. A completed normalized replay is:

```js
{
  outcomes,
  survivorOrderIds,
  topFindingId
}
```

Where:

```text
outcomes = one normalized outcome per bound attack, in bound attack order
survivorOrderIds = actual M8 survivor IDs in M8 rank order
topFindingId = survivorOrderIds[0] when non-empty, else null
```

This binding is identical for baseline and after payloads and remains independently owned from full M8 results.

## 7. Exact public option records

The public wrappers remain closed local schema records:

```text
draft   -> experiment, sourceAttackId, proposal
confirm -> draft, decision
verify  -> protection, evaluator, improvedEvaluator
```

Revision 19 additionally applies the exact ordinary mutable record surface from Section 3 to these wrappers. Alternate descriptor/extensibility surfaces reject asynchronously with `TypeError` just like extras, symbols, accessors, Proxies, omissions, and non-local prototypes.

Invocation capture remains synchronous-before-Promise-return, while validation failures remain asynchronous native-Promise rejections.

## 8. Verification reruns artifact wire safety

A confirmed artifact may be reconstructed, stored, copied between processes, or presented after mutable prototype state changes.

Verification therefore reruns the single normative `probeCompletedProtectionArtifactV1()` before either evaluator executes.

Revision 19 extends probe revalidation to include the exact record, schema-less record, and Array descriptor/extensibility surfaces in addition to whole-tree validity, key order, prototype baseline, JSON size/nesting, cross-field authority, and protection text identity.

A current descriptor/extensibility mismatch or normalization drift rejects with `TypeError` before callback execution.

## 9. Attack equality and schema-less key order remain separated

Schema-less key order remains evaluator-visible replay authority for retained values.

M8 unchanged-output and same-rule duplicate filtering still uses the explicit `isM8AttackFilterEqualV1` rule that ignores plain-object key insertion order only for attack retention. An order-only object-key permutation is not a distinct V1 attack.

Once an attack is retained for a substantive difference, its exact historical schema-less key order and ordinary mutable descriptor surface are preserved through experiment snapshot, JSON reload, and evaluator replay.

No attack-set expansion is introduced.

## 10. Experiment ownership remains isolated from legacy M8 result paths

Every Object/Array reachable from a replayable `result.experiment` remains identity-disjoint from every Object/Array reachable through all other M8 result paths, including `generatedAttacks`, attack results, top finding, and survivor compatibility structures.

M8 builds experiment authority from independent deep-owned snapshots. Mutation through a legacy result path cannot change experiment authority.

If disjoint ownership cannot be safely established, M8 emits the non-replayable experiment variant.

## 11. Final authority chain

```text
module-start captured intrinsics + mandatory probe capability
  -> exact ordinary public option-wrapper capture
  -> validated M8 case before callbacks
  -> frozen case eligibility + owned canonical case snapshots
  -> exact schema-less key/descriptor snapshots
  -> retained attack/output snapshots
  -> complete tree candidate experiment
  -> exact 1..7 rule authority
  -> experiment disjoint from all legacy M8 result paths
  -> prototype-baseline + JSON experiment probe
  -> emitted replayable experiment
  -> external adapter obtains declarative proposal
  -> invocation-time descriptor/brand/identity capture
  -> owned experimentAuthority
  -> exact proposal authority binding
  -> complete tree draft with exact public surfaces
  -> completed-artifact wire probe
  -> invocation-time confirmation capture
  -> complete tree confirmed/rejected artifact
  -> completed-artifact wire probe
  -> invocation-time verification capture
  -> verification-time completed-artifact wire probe
  -> owned verificationAuthority
  -> baseline replay
  -> exact historical identity gate
  -> improved replay
  -> actual survivor summary + first-survivor top finding
  -> independently allocated complete-tree verification result
```

No later phase rereads mutable caller authority. No M10 proposal-generation callback executes.

## 12. Replayability and data boundary

Replayable V1 remains intentionally narrow:

- null/string/boolean;
- finite numbers except `-0` using captured numeric intrinsics;
- dense extensible local Arrays with exact ordinary mutable index descriptors and exact writable length descriptor;
- extensible local Object-prototype data records with exact writable/enumerable/configurable `true` own data properties;
- exact mandatory forbidden-brand rejection;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no cycles or repeated identity;
- schema-less retained wire records preserve captured recursive own-key order;
- order-only key permutations are excluded as distinct attacks at M8 retention time;
- exact signed-zero-safe attack scores;
- exact V1 contract rule count `1..7`;
- replayable experiment containers are disjoint from all sibling M8 result containers.

Experiments, protection artifacts, and verification results remain complete trees. Experiments and protection artifacts must survive the supported JSON round trip without semantic, order, identity, descriptor, or extensibility drift.

## 13. Public completion model

All three public APIs remain genuine-local-native-Promise-only.

Invocation capture occurs synchronously before Promise return but exposes no synchronous validation-error channel. Capture/schema/authority/wire-boundary failures reject asynchronously with `TypeError`.

Drafting executes no model/provider/proposal callback.

Only evaluator callbacks remain executable in M10 and are delegated to the existing M8 evaluator execution boundary. Verification performs all artifact boundary checks before the first evaluator.

## 14. Human and historical authority

Drafting returns only `draft`.

Confirmation accepts only `draft` and maps:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only a currently valid, freshly re-probed confirmed complete-tree artifact.

The baseline evaluator is a compatibility witness. Historical authority remains the bound experiment: every per-attack classification, survivor order, and top finding must match before improved evaluation begins.

Completed baseline and after replay projections expose actual survivor rank order, not placeholder values.

## 15. Required proof obligations

Implementation must prove at least:

- each public top-level options object accepts exactly its named keys and exact ordinary mutable property surface, rejecting extras/accessors/symbols/Proxies/non-local prototypes/frozen/sealed/non-extensible/alternate-descriptor wrappers;
- every Gotcha-created and accepted schema record is extensible with writable/enumerable/configurable `true` data properties, and direct snapshot vs JSON reload surfaces match;
- every accepted Array is extensible, has exact ordinary mutable index descriptors, and has the exact writable/non-enumerable/non-configurable length descriptor;
- sealed/frozen/non-extensible/non-ordinary-index Arrays reject;
- schema-less wire records preserve recursive captured key order and exact ordinary mutable descriptor/extensibility surface through snapshot, JSON reload, and evaluator replay;
- the exact mandatory forbidden-brand list and fail-closed missing-probe behavior remain unchanged;
- captured `Number.isFinite`, captured `Object.is`, and captured trim remain authoritative after global mutation;
- exact V1 rule-count tests prove 7 accepted and 8 rejected;
- invocation capture rejects repeated identities/cycles before copying;
- immediate caller mutation after API return cannot alter captured authority;
- drafting executes no provider/model/proposal callback;
- proposal data is exact, local, declarative, and rebound to experiment task/source/rule authority;
- order-only object-key permutations are filtered as unchanged/duplicate and are not retained as V1 attacks;
- every replayable experiment container is identity-disjoint from every other M8 result path;
- mutating `generatedAttacks`, attack results, top finding, or compatibility fields cannot mutate `result.experiment`;
- accepted experiments and protection artifacts are whole trees before and after JSON round trip;
- verification reruns the exact completed-artifact wire probe before evaluator execution;
- verification-time JSON size/nesting/prototype-baseline/descriptor failure rejects with `TypeError` and neither evaluator runs;
- completed replay payloads expose actual M8 survivor rank order and bind top finding to first survivor or null;
- every verification result is a complete tree with independently allocated diagnostic arrays/replay payloads and exact public property surfaces;
- signed-zero, severity, ordering, draft-only confirmation, evaluator-state mapping, baseline identity, and complete failure-reason semantics remain exact.

## 16. Scope

Expected implementation files:

```text
src/contract-remediation.js
src/index.js
src/contract-attacks.js
test/contract-remediation.test.js
```

No callback-realm/prototype-guard helper is required.

Provider/model adapters remain outside this architecture PR and can be implemented later around the declarative proposal boundary without changing trusted authority semantics.

`src/engine.js` and `src/mutation-pack.js` remain unchanged by default.

Lossless arbitrary graph/prototype serialization, cryptographic attestation, dashboards, production-model execution inside M10 core, generated evaluator code, automatic patching, and unrelated engine redesign remain out of scope.

## 17. Stopping rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 19 spec.