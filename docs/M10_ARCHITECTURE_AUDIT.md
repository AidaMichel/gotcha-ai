# M10 — Contract Remediation Architecture Audit

Status: Complete — Revision 20
Milestone: 10
Audit base: `main@286c9fccc1d3a6107a1b16511aedef5f6265aa3f`
Companion spec: `docs/M10_CONTRACT_REMEDIATION_SPEC.md`

## 1. Audit question

What is the smallest deterministic architecture that can turn one confirmed M8 survivor into a human-authorized declarative protection and verify an externally supplied improved evaluator against the exact bound experiment without serialization drift, prototype ambiguity, identity normalization, post-call authority races, confirmation bypass, key-order drift, descriptor normalization, legacy-result aliasing, evaluator-surface drift, error-brand drift, or implementation-dependent boundary behavior?

## 2. Revision 20 principle

Revision 20 keeps the trusted-core simplification introduced in Revision 16 and closes the four exact-head Revision 19 P1 findings without widening the architecture.

The four direct closures are:

1. ordinary mutable descriptor/extensibility rules apply only to wire/authority values; evaluator callbacks continue to receive the existing frozen M8 `createEvaluatorSnapshot()` projection with detached safe prototypes and unchanged mutation-failure semantics;
2. the additive public `result.experiment` field is appended exactly after `topFinding`, with one pinned successful-result own-key order and ordinary writable/enumerable/configurable descriptor while the result remains extensible;
3. every complete verification state now fixes both positive-control flags exactly `true`;
4. the local intrinsic `TypeError` constructor is captured at module initialization and every M10 boundary rejection uses that captured construction authority.

No provider callback, global prototype guard, callback-realm projection, engine redesign, or new executable authority is introduced.

## 3. Wire authority is distinct from the evaluator callback surface

Revision 19 correctly fixed the serialized/reloaded wire property surface but described those objects too broadly as evaluator-facing. Current M8 already owns a stricter evaluator safety boundary.

Revision 20 makes the layering exact:

```text
M10 experiment/artifact authority
  -> extensible ordinary wire records/Arrays with exact key/descriptor rules
  -> reconstructed M8 generator candidate
  -> existing M8 createEvaluatorSnapshot()
  -> frozen independently owned callback value with detached safe prototypes
  -> evaluator(output)
```

The mutable wire surface exists only to make direct authority snapshots and JSON reloads deterministic. M10 never passes that mutable object directly to an evaluator.

Both baseline and improved replay must use the existing M8 callback preparation path unchanged. In particular, Revision 20 does not authorize weakening or bypassing:

- detached safe callback prototypes;
- callback-container freezing/non-extensibility;
- independent callback ownership;
- existing mutation-failure behavior;
- existing M8 evaluator execution semantics.

Historical data values and schema-less key order are preserved into the M8 snapshot projection, while the callback-visible descriptor/extensibility surface intentionally remains the established frozen M8 surface.

## 4. Exact additive M8 result surface

Current successful M8 result construction has the legacy key order:

```text
version
task
baselinePassed
generatedAttacks
discardedAttacks
attack
topFinding
```

Revision 20 adds exactly one field without reordering or changing any legacy descriptor:

```text
version
task
baselinePassed
generatedAttacks
discardedAttacks
attack
topFinding
experiment
```

`experiment` is appended after `topFinding`. The result remains an extensible local ordinary object. All eight properties are ordinary own data properties with:

```text
writable = true
enumerable = true
configurable = true
```

Therefore existing `Object.keys`/`Reflect.ownKeys` observations preserve the seven-key legacy prefix exactly, with one final additive key.

The nested experiment remains identity-disjoint from every legacy result path.

## 5. Captured TypeError authority

Revision 19 required deterministic TypeError rejection but did not pin how that TypeError brand is constructed if `globalThis.TypeError` is later replaced.

Revision 20 captures the local intrinsic constructor at module initialization:

```text
capturedTypeError = local intrinsic TypeError constructor
makeBoundaryTypeErrorV1(message) = new capturedTypeError(message)
```

All schema, boundary, authority, status, wire-probe, and internal construction failures specified as TypeError use this captured constructor. Error text is non-authoritative.

Replacing `globalThis.TypeError` after module initialization therefore cannot change the public rejection brand.

## 6. Complete verification positive-control facts

Any result that reaches complete improved replay necessarily passed baseline positive control, exact baseline historical identity, and improved positive control.

Revision 20 therefore fixes for all three complete terminal states:

```text
baselinePositiveControlPassed = true
improvedPositiveControlPassed = true
```

This applies to:

```text
verified
regression-detected
source-finding-still-survives
```

Neither flag may be `null` or `false` in a complete result. Partial-state values remain exactly as already specified by the phase/failure table.

## 7. Existing Revision 19 wire and schema surfaces remain locked

Every accepted and Gotcha-created schema record still has:

```text
prototype = local Object.prototype
Object.isExtensible(record) = true
exact canonical own string keys only
for every schema property:
  writable = true
  enumerable = true
  configurable = true
```

Schema-less wire/authority records remain extensible with exact ordinary mutable own data descriptors while preserving captured key order.

Arrays remain exact dense extensible local Arrays with ordinary mutable index descriptors and exact `length`:

```text
writable = true
enumerable = false
configurable = false
value = actual length
```

These are storage/authority boundaries, not callback-surface definitions.

## 8. Exact rule-count and replay-summary authority remain locked

The V1 contract rule limit remains:

```text
MAX_RULES_V1 = 7
```

Completed replay payloads remain exactly:

```js
{
  outcomes,
  survivorOrderIds,
  topFindingId
}
```

with actual M8 survivor rank order and `topFindingId` exactly equal to the first survivor or `null` when none survive.

## 9. Public option, invocation, and artifact boundaries remain locked

The public wrappers remain closed local schema records:

```text
draft   -> experiment, sourceAttackId, proposal
confirm -> draft, decision
verify  -> protection, evaluator, improvedEvaluator
```

Invocation capture remains synchronous-before-Promise-return, side-effect-free, alias/cycle rejecting, and authority preserving. Validation failures remain asynchronous native-Promise rejections, now explicitly using the captured local TypeError constructor.

Verification still reruns the single completed-artifact wire probe before either evaluator executes.

## 10. Attack equality and schema-less key order remain separated

M8 unchanged-output and same-rule duplicate filtering still uses `isM8AttackFilterEqualV1`, which intentionally ignores plain-object insertion order only for attack retention.

An order-only object-key permutation is not a distinct V1 attack.

For substantively retained attacks, exact historical data/key order is preserved in wire authority and then enters the existing frozen M8 evaluator snapshot projection.

No attack-set expansion is introduced.

## 11. Experiment ownership remains isolated from legacy M8 result paths

Every Object/Array reachable from a replayable `result.experiment` remains identity-disjoint from every Object/Array reachable through all other M8 result paths, including `generatedAttacks`, attack results, top finding, and survivor compatibility structures.

M8 builds experiment authority from independent deep-owned snapshots. Mutation through a legacy result path cannot change experiment authority.

If disjoint ownership cannot be safely established, M8 emits the non-replayable experiment variant.

## 12. Final authority chain

```text
module-start captured intrinsics + captured local TypeError + mandatory probe capability
  -> exact ordinary public option-wrapper capture
  -> validated M8 case before callbacks
  -> frozen case eligibility + owned canonical wire snapshots
  -> exact schema-less key/descriptor wire authority
  -> existing frozen M8 evaluator snapshot boundary
  -> retained attack/output wire snapshots
  -> complete tree candidate experiment
  -> exact 1..7 rule authority
  -> experiment disjoint from all legacy M8 result paths
  -> append experiment after topFinding on exact legacy M8 result surface
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
  -> baseline replay through existing frozen M8 callback boundary
  -> exact historical identity gate
  -> improved replay through same M8 callback boundary
  -> both complete-state positive-control flags = true
  -> actual survivor summary + first-survivor top finding
  -> independently allocated complete-tree verification result
```

No later phase rereads mutable caller authority. No M10 proposal-generation callback executes.

## 13. Replayability and data boundary

Replayable V1 remains intentionally narrow:

- null/string/boolean;
- finite numbers except `-0` using captured numeric intrinsics;
- dense extensible local wire Arrays with exact ordinary mutable index descriptors and exact writable length descriptor;
- extensible local Object-prototype wire records with exact writable/enumerable/configurable `true` own data properties;
- exact mandatory forbidden-brand rejection;
- no accessors, symbols, custom/null/cross-realm prototypes;
- no cycles or repeated identity;
- schema-less retained wire records preserve captured recursive own-key order;
- order-only key permutations are excluded as distinct attacks at M8 retention time;
- exact signed-zero-safe attack scores;
- exact V1 contract rule count `1..7`;
- replayable experiment containers are disjoint from all sibling M8 result containers.

Experiments and protection artifacts survive the supported JSON round trip without semantic, order, identity, descriptor, or extensibility drift. Evaluator callbacks do not observe these mutable wire surfaces; M8 converts them through its established frozen snapshot boundary.

## 14. Public completion model

All three public APIs remain genuine-local-native-Promise-only.

Invocation capture occurs synchronously before Promise return but exposes no synchronous validation-error channel. Capture/schema/authority/wire-boundary failures reject asynchronously with the captured local TypeError brand.

Drafting executes no model/provider/proposal callback.

Only evaluator callbacks remain executable in M10 and are delegated to the existing M8 evaluator execution boundary. Verification performs all artifact boundary checks before the first evaluator.

## 15. Human and historical authority

Drafting returns only `draft`.

Confirmation accepts only `draft` and maps:

```text
accept -> confirmed
edit   -> confirmed
reject -> rejected
```

Verification accepts only a currently valid, freshly re-probed confirmed complete-tree artifact.

The baseline evaluator is a compatibility witness. Historical authority remains the bound experiment: every per-attack classification, survivor order, and top finding must match before improved evaluation begins.

Completed baseline and after replay projections expose actual survivor rank order. Every complete result explicitly reports both positive controls as passed.

## 16. Required proof obligations

Implementation must prove at least:

- each public top-level options object accepts exactly its named keys and exact ordinary mutable property surface, rejecting extras/accessors/symbols/Proxies/non-local prototypes/frozen/sealed/non-extensible/alternate-descriptor wrappers;
- every Gotcha-created and accepted schema record is extensible with writable/enumerable/configurable `true` data properties, and direct snapshot vs JSON reload surfaces match;
- every accepted wire Array is extensible, has exact ordinary mutable index descriptors, and has the exact writable/non-enumerable/non-configurable length descriptor;
- sealed/frozen/non-extensible/non-ordinary-index wire Arrays reject;
- schema-less wire records preserve recursive captured key order and exact ordinary mutable descriptor/extensibility surface through snapshot and JSON reload;
- baseline and improved evaluators receive the existing frozen `createEvaluatorSnapshot()` callback projection, never the mutable wire object, and existing M8 mutation-failure tests remain unchanged;
- successful M8 result own-key order is exactly `version, task, baselinePassed, generatedAttacks, discardedAttacks, attack, topFinding, experiment`, with the new field appended and ordinary writable/enumerable/configurable;
- all existing seven legacy M8 result keys retain their previous relative order and ordinary descriptors;
- captured local TypeError construction remains authoritative even after `globalThis.TypeError` mutation;
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
- verification-time JSON size/nesting/prototype-baseline/descriptor failure rejects with the captured local TypeError and neither evaluator runs;
- completed replay payloads expose actual M8 survivor rank order and bind top finding to first survivor or null;
- every complete terminal state sets `baselinePositiveControlPassed === true` and `improvedPositiveControlPassed === true`;
- every verification result is a complete tree with independently allocated diagnostic arrays/replay payloads and exact public result surfaces;
- signed-zero, severity, ordering, draft-only confirmation, evaluator-state mapping, baseline identity, and complete failure-reason semantics remain exact.

## 17. Scope

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

## 18. Stopping rule

M10 architecture is implementation-ready only after a fresh exact-head Codex review reports no concrete contradiction or remaining V1 implementation-choice ambiguity in the Revision 20 spec.