# M14 — Guided V0 Experience

Status: Architecture Draft — Revision 3
Milestone: 14
Branch: `milestone-14-guided-v0-flow`
Base: `main@2a55a41624d406aac5f0e6d36a9817b3af1a5e10`

## 1. Goal

M14 turns the now-complete Gotcha V0 core loop into one coherent first-time product experience without creating a second attack, contract, remediation, or provider engine.

The public package already exposes the complete semantic path:

```text
TEACH
  -> CONTRACT
  -> CONFIRM
  -> ATTACK
  -> RANK
  -> GOTCHA
  -> CATCH THIS
  -> RE-ATTACK
```

Today, a developer must still understand and manually stitch together the individual public APIs. The current CLI exposes only `demo` and help. M14 adds a thin guided CLI application layer that orchestrates the existing public APIs, preserves every existing authority boundary, and makes the V0 loop understandable without requiring the user to learn Gotcha's internal milestone/API structure.

The M14 product target is:

> A first-time developer with one local evaluator and one provider transport can get from setup to a meaningful Gotcha finding, a human-reviewed protection proposal, and a verification/re-attack result through a small guided workflow.

M14 is a product-orchestration milestone, not a new trusted-core milestone.

Revision 3 closes the architecture audit ambiguities found after Revision 2:

1. `verify` requires only the current baseline and improved evaluators; it does not require or touch provider/task/example config fields;
2. displayed remediation choices are derived directly from the replayable experiment's bound survivor order, never reconstructed/re-ranked independently;
3. terminal TTY status is not treated as proof of human authority; explicit stdin answers are allowed, but no auto-accept/select bypass exists;
4. session persistence must remain stack-safe for Gotcha's supported deep replayable evidence and cannot regress to a naïve recursive full-tree `JSON.stringify(session)` boundary;
5. the earlier Revision-2 baseline/improved evaluator, non-overwrite, cancellation, and public-entry-point rules remain locked.

## 2. Architectural rule: one core, one guided application layer

M14 MUST NOT reimplement semantic logic already owned by M7, M8, M10, M11, M12, or M13.

The guided layer delegates semantic authority exactly as follows:

```text
draftQualityContract()                 M7
confirmQualityContract()               M7
runContractAttacks()                   M8
createStructuredProviderAdapter()      M11
prepareContractQualityLoop()           M12
generateContractProtectionProposal()   M13
completeContractQualityLoop()          M12 -> M10 verification
```

M14 application code obtains those semantic entry points only from Gotcha's public package/root API. It MUST NOT import private semantic implementation modules to obtain alternate versions of contract, attack, provider, proposal, confirmation, or verification authority.

M14 may validate its own CLI/config/session convenience surfaces enough to produce useful local errors, but those checks are not semantic authority. Every artifact entering an existing public API is revalidated by that owning API under its existing contract.

M14 MUST NOT:

- create a second Quality Contract schema;
- create a second attack schema or ranking algorithm;
- reinterpret M8 survivors or scores;
- auto-select `topFinding` as the remediation source;
- create a second protection proposal schema;
- bypass M10/M12 replay or verification;
- auto-confirm, auto-edit, or auto-reject a contract/protection;
- generate or patch executable evaluator code;
- persist human decisions as reusable authority;
- make hidden network calls;
- read or store provider credentials;
- add model-provider-specific logic to the trusted core;
- add retries, fallback models, failover, background execution, workers, daemons, or hosted state;
- treat the CLI integration module as untrusted sandboxed code.

## 3. User-facing commands

M14 adds exactly three guided CLI commands while preserving the existing commands:

```text
gotcha-ai demo
gotcha-ai --help

gotcha-ai init [directory]
gotcha-ai run [--config path] [--session path]
gotcha-ai verify <session-path> [--config path]
```

No command silently changes another command's behavior.

### 3.1 `gotcha-ai init`

`init` creates a minimal local starter integration and local session directory.

Default target when no directory is supplied is the current working directory.

It creates, only when the path does not already exist:

```text
gotcha.config.js
.gotcha/.gitignore
```

`gotcha.config.js` is a commented CommonJS starter matching Section 4.

`.gotcha/.gitignore` contains a deny-by-default rule for generated session artifacts so the default guided workflow does not encourage committing captured task/input/output evidence.

`init` MUST NOT overwrite an existing `gotcha.config.js` or existing `.gotcha/.gitignore`. Existing-path conflict is a user-visible non-zero CLI error.

`init` does not contact a model/provider and does not create a session.

### 3.2 `gotcha-ai run`

`run` performs the guided first half plus proposal generation in one process:

```text
LOAD INTEGRATION
  -> TEACH / CONTRACT
  -> HUMAN CONTRACT CONFIRMATION
  -> ATTACK
  -> RANK / GOTCHA
  -> HUMAN SURVIVOR SELECTION
  -> PROTECTION PROPOSAL
  -> SAVE NON-AUTHORITATIVE SESSION
```

It does not verify remediation because the user has not yet supplied a distinct improved evaluator.

The final successful `run` message tells the user exactly:

1. what finding was selected;
2. what declarative protection was proposed;
3. where the local session file was written;
4. that the original `evaluator` must remain available with baseline behavior for verification;
5. that the human/caller must implement the stronger behavior separately as `improvedEvaluator`; and
6. the exact `gotcha-ai verify ...` command to continue.

M14 never edits either evaluator implementation.

### 3.3 `gotcha-ai verify`

`verify` resumes from a saved non-authoritative session after the user has retained a baseline evaluator that reproduces the original run and supplied a separate `improvedEvaluator` in the trusted local integration module.

It performs:

```text
LOAD CURRENT EVALUATOR INTEGRATION
  -> LOAD UNTRUSTED SESSION DATA
  -> RE-PREPARE CURRENT M12 CHECKPOINT
  -> SHOW EXACT CURRENT DRAFT
  -> FRESH HUMAN ACCEPT / EDIT / REJECT
  -> COMPLETE M12/M10 QUALITY LOOP
  -> RE-ATTACK / REPORT IMPROVEMENT
```

A session never stores a reusable human decision. A resumed verification always displays the exact current draft and obtains a fresh decision in the current process before `completeContractQualityLoop()`.

This preserves M12's human reinspection requirement when a proposal/experiment crosses mutable storage.

## 4. Trusted local integration module

The default integration path is:

```text
./gotcha.config.js
```

`--config path` may select another local CommonJS module.

The integration module is **trusted local integration code**, just like the evaluator/generator callbacks already documented by Gotcha. Loading it may execute arbitrary JavaScript. M14 does not claim to sandbox a malicious config module.

The V1 starter is conceptually:

```js
module.exports = {
  task: "Schedule meetings from user requests.",

  examples: [
    // existing M7 teaching examples
  ],

  case: {
    input: "Schedule Sara Tuesday at 3 PM.",
    expectedOutput: "Meeting scheduled with Sara Tuesday at 3 PM."
  },

  evaluator(output) {
    // BASELINE evaluator. Keep equivalent baseline behavior available for verify.
    return true;
  },

  provider: {
    model: "caller-owned-model-name",

    async transport(request) {
      // caller/provider integration
      // credentials remain caller-owned, normally from environment variables
    }
  }

  // After applying a human-approved protection, ADD a separate function:
  // improvedEvaluator(output) {
  //   return true;
  // }
};
```

### 4.1 `run` config requirements

For `run`, required integration fields are exactly:

```text
task
examples
case.input
case.expectedOutput
evaluator
provider.model
provider.transport
```

M14 may reject clearly malformed/missing fields early for product ergonomics, but existing public APIs remain authoritative for task/examples/contract/attack/evaluator/provider semantics.

The `init` starter MUST NOT export an active placeholder `improvedEvaluator`. It may contain commented guidance only. A generated placeholder callable must never allow a user to reach verification without intentionally adding an improved implementation.

### 4.2 `verify` config requirements

For `verify`, the only semantic callbacks required from the current config are exactly:

```text
evaluator
improvedEvaluator
```

`verify` MUST NOT require `task`, `examples`, `case`, `provider`, `provider.model`, or `provider.transport` merely because those fields were required by the earlier `run` command.

`verify` MUST NOT construct an M11 adapter, invoke a provider transport, or perform model work.

A user may continue using the original all-in-one `gotcha.config.js`, but a smaller verify-only config that exports exactly the two evaluator callbacks is valid application input.

### 4.3 Baseline/improved evaluator rule

The `evaluator` loaded by `verify` is the baseline replay callback. It must reproduce the bound historical behavior under M10's existing replay identity gate.

The user must not replace the baseline export with the improved logic and then present that changed behavior as the historical evaluator. M10's baseline replay/mismatch gate remains authoritative and prevents improved evaluation from starting when historical behavior does not reproduce.

The changed quality logic belongs in the separate `improvedEvaluator` export.

M14 does not try to authenticate source-code identity across processes. The explicit config fields are caller-selected trusted callbacks; M10 replay is the semantic proof for the baseline.

M14 documentation and generated comments MUST describe this distinction explicitly.

### 4.4 Provider-neutral adapter construction

M14 never defines provider-specific request formats.

From the one caller-owned `{ model, transport }`, `run` creates three public M11/M13 adapter modes:

```text
mode = "quality-contract"
mode = "contract-attacks"
mode = "contract-protection"
```

Those adapters are then supplied to the existing M7/M8/M13 APIs.

M14 MUST NOT call the raw `transport` directly for model work.

The existing structured provider boundary remains authoritative for:

- transport invocation shape;
- structured-output schema;
- mode-specific request envelopes;
- response validation;
- exactly-once transport semantics;
- no implicit retry/failover behavior.

## 5. Guided `run` state machine

The exact V1 phases are:

```text
loading
contract-draft
contract-confirmation
attacking
finding-selection
proposal-generation
session-written
no-active-rules
no-survivor
failed
```

User cancellation is a process-control outcome, not a semantic phase; Section 9 defines it separately.

The CLI may display friendly phase names, but it must not silently skip a semantic phase.

### 5.1 Contract drafting

`run` calls exactly one M7 draft operation with:

```text
task = config.task
examples = config.examples
generator = structured quality-contract adapter
```

Provider/model failures surface as errors. M14 does not retry.

### 5.2 Contract confirmation

Every proposed rule is shown to the human before confirmation.

The CLI supports the exact decision types already supported by `confirmQualityContract()`:

```text
accept
edit
reject
```

For M7 `edit`, the only V1 editable rule field is the existing human-edited `statement`; severity remains the existing proposed M7 severity. M14 does not invent additional edit semantics.

There is no default decision that converts pressing Enter into `accept`.

Only after the complete human decision set exists does M14 call `confirmQualityContract()` exactly once.

If the result has no active rules, the guided run stops successfully with an explanatory `no-active-rules` product result. It MUST NOT continue to attack with an empty/meaningless confirmed contract.

### 5.3 Attack

After a confirmed active contract exists, `run` calls exactly one `runContractAttacks()` using:

```text
contract = confirmed contract
input = config.case.input
expectedOutput = config.case.expectedOutput
evaluator = config.evaluator
generator = structured contract-attacks adapter
```

M14 does not alter generated attacks, attribution, scoring, deduplication, survivor ranking, replayability, or `topFinding` semantics.

### 5.4 No-survivor result

If no attack survives, M14 returns a successful product state rather than manufacturing a finding.

The CLI says plainly that Gotcha did not find a surviving blind spot in this run.

It MUST NOT:

- invent a Gotcha finding;
- select a caught attack;
- generate a protection proposal without a surviving source;
- claim the evaluator is globally correct.

### 5.5 Finding presentation source of truth

The remediation-choice list is derived exactly from the completed replayable M8 experiment:

```text
result.experiment.baseline.survivorOrderIds
```

M14 takes at most the first five IDs in that exact order and presents the corresponding bound experiment attack/rule evidence.

M14 MUST NOT:

- re-sort survivors;
- recompute scores/rank;
- substitute `topFinding` as selection authority;
- include caught attacks in the choice list;
- synthesize a source ID not present in the bound survivor order.

Each displayed finding includes only evidence already available from the bound M8 result/experiment/contract, such as:

```text
rank
attack id
rule id
rule statement
severity
description/rationale
current evaluator result = PASS
```

M14 MUST NOT claim that the candidate is a proven production-model failure. It remains an AI-proposed rule violation that passed the supplied evaluator.

If more than five replayable survivors exist, the CLI says that additional findings exist, but V1 source selection is limited to the displayed first five. This is a product-display constraint, not a change to M8 ranking.

### 5.6 Explicit survivor selection

The human/caller must explicitly select one displayed survivor.

There is no default survivor, no automatic first-item selection, and no silent use of `topFinding`.

Blank input, invalid rank, or unknown attack ID does not advance the state.

The selected exact bound attack ID becomes M13 `sourceAttackId`.

### 5.7 Protection proposal

M14 calls exactly one `generateContractProtectionProposal()` using:

```text
experiment = exact M8 replayable experiment
sourceAttackId = explicit selected bound survivor id
generator = structured contract-protection adapter
```

M14 then displays the returned declarative proposal as a proposal, never as an applied fix.

M14 does not call M12 completion during `run`.

## 6. Session artifact: convenience data, never authority

After proposal generation, `run` writes one local JSON session artifact under `.gotcha/` by default.

The session contains exactly:

```js
{
  version: 1,
  kind: "gotcha-guided-session",
  experiment,
  sourceAttackId,
  proposal
}
```

The M14 reader may reject a malformed top-level session envelope early when `version`, `kind`, required keys, JSON form, or exact key set is wrong. That is only convenience validation. M10/M12 remain authoritative for the experiment/source/proposal semantics.

No human confirmation decision is stored.

No evaluator/generator/transport function is serialized.

No provider credential, environment variable, API token, request header, raw transport object, or model-provider SDK object is intentionally persisted by M14.

The session can contain task text, contract/evidence carried by the experiment, user input, expected output, generated attack data, and proposal text. The CLI MUST tell the user that the session contains local evaluation evidence and should be treated as potentially sensitive project data.

### 6.1 Storage path and overwrite rule

Default session location is a unique path:

```text
.gotcha/session-<uuid>.json
```

The identifier is generated locally with a facility available at the documented Node 14.18 floor. It is only a filename discriminator; it is not security/provenance authority.

`--session path` may choose an explicit output path.

M14 MUST NOT silently overwrite an existing session at either the default-generated or explicit path. If a generated candidate already exists, choose another generated identifier. If an explicit target exists, fail clearly.

V1 intentionally has no session registry/history database. The path printed by `run` is the resume handle.

### 6.2 Stack-safe session encoding

M14 MUST NOT make successful persistence of a core-supported replayable experiment depend on JavaScript call-stack depth by recursively applying a whole-tree serializer.

The writer uses an iterative/explicit-stack JSON-compatible encoder for the M14-created session tree. It may use native JSON string escaping for primitive strings/property names, but traversal of nested Object/Array containers is iterative.

This session encoder is **not semantic authority** and MUST NOT duplicate M8/M10/M13 experiment/proposal validation. It only serializes the already-produced session convenience tree. On resume, the parsed data is untrusted and revalidated by M12/M10.

At minimum, permanent proof must cover a session containing the same supported 12,000-level replayable evidence class already exercised by the protection-proposal path, with no JavaScript stack overflow during write/read handoff.

Serialization must complete before the final target is exposed as a completed session.

### 6.3 Local file safety

Writing uses a same-directory temporary file plus a finalization mechanism that does not intentionally expose partial JSON as the completed target and never overwrites an existing explicit target.

Where supported by Node/filesystem semantics, the created file should request owner-only permissions (`0600`). Permission failure that still permits the write does not create a false claim that the OS enforced secrecy; docs state this as best effort.

The default `.gotcha/.gitignore` prevents generated session files from being committed accidentally when the normal init path is used.

### 6.4 Session trust rule

The session is **untrusted mutable storage**.

On `verify`, M14 parses it as data and passes its current `experiment`, `sourceAttackId`, and `proposal` into `prepareContractQualityLoop()`.

M12/M10 then independently revalidate replayability, source binding, proposal shape, ownership/wire invariants, and the current draft.

M14 MUST NOT mark a session trusted merely because:

- M14 wrote it earlier;
- its JSON parsed successfully;
- it contains a known `kind`/`version`;
- its file path is inside `.gotcha/`;
- a previous process already validated its contents;
- the UUID in its filename looks valid.

Mutating a saved session must never bypass current M10/M12 validation.

## 7. Guided `verify` state machine

The exact V1 phases are:

```text
loading
session-validation
checkpoint-preparation
protection-confirmation
verification
complete
rejected
failed
```

### 7.1 Current evaluator requirements

`verify` loads the current trusted integration module and requires exactly two semantic callbacks:

```text
evaluator
improvedEvaluator
```

The baseline `evaluator` is replayed first by M10 and must reproduce the bound historical result. This existing baseline identity gate protects against verifying changed baseline behavior as if it were the original experiment.

The improved evaluator is never used if baseline replay fails/mismatches or if the human rejects the draft.

M14 must not try to infer which function is “old” or “new” by source text, timestamps, filenames, or convenience metadata.

### 7.2 Re-prepare instead of persisting checkpoints

M14 intentionally does **not** persist an M12 checkpoint from the `run` process.

Instead `verify` calls exactly one current:

```js
prepareContractQualityLoop({
  experiment: session.experiment,
  sourceAttackId: session.sourceAttackId,
  proposal: session.proposal
});
```

The fresh checkpoint's exact current draft is then shown to the human/caller.

This avoids treating a serialized historical checkpoint as proof of what is currently being reviewed.

### 7.3 Fresh protection decision

The CLI supports the exact M10/M12 protection decisions:

```text
accept
edit
reject
```

There is no default accept.

For edit, M14 collects only the exact existing M10/M12 protection edit fields. It does not invent a new remediation edit schema.

If the decision is reject, M14 calls the existing M12 completion/confirmation path and stops at its rejected semantic state. Neither evaluator may execute in a rejected completion.

If the decision is accept/edit, M14 calls exactly one `completeContractQualityLoop()` with:

```text
checkpoint = freshly prepared checkpoint
decision = fresh explicit decision
evaluator = current config.evaluator
improvedEvaluator = current config.improvedEvaluator
```

M14 does not reinterpret the returned M10/M12 verification state.

## 8. Result presentation

M14 translates existing semantic result data into concise product language but preserves the underlying state accurately.

### 8.1 Gotcha finding

A selected finding may be rendered conceptually as:

```text
GOTCHA
Your evaluator accepted a candidate that violates:
"The scheduled time must match the requested time."

Current evaluator: PASS
Severity: critical
```

This is presentation only. M14 does not strengthen M8's epistemic claim.

### 8.2 Proposal

Proposal output clearly says:

```text
PROPOSED PROTECTION
```

not:

```text
FIXED
APPLIED
VERIFIED
```

until the corresponding existing semantic state actually supports such language.

### 8.3 Verification

For a complete M10/M12 replay, M14 displays at least:

```text
state
verificationPassed
before survivor count
after survivor count
sourceFindingCaught
improvement
regressionAttackIds
failureReasons
```

Examples:

```text
VERIFIED
Before: 4 survivors
After: 1 survivor
Selected finding: CAUGHT
Improvement: 3 fewer survivors
```

or:

```text
NOT VERIFIED — REGRESSION DETECTED
Selected finding: CAUGHT
New regression attacks: attack-7
```

M14 MUST NOT collapse a `regression-detected`, `baseline-mismatch`, positive-control failure, execution failure, or `source-finding-still-survives` result into a generic success.

## 9. Prompt/input and runtime behavior

M14 uses Node's existing callback/event-based `readline` surface; it MUST NOT require `node:readline/promises` or another newer-only convenience API merely to implement prompts.

The intended UX is an interactive terminal, but **TTY presence is not human-authority proof**. M14 does not use `stdin.isTTY` / `stdout.isTTY` as a security or confirmation gate.

Every required decision must arrive as an explicit valid answer to the current prompt. Blank input never means accept/select.

V1 does not add `--yes`, `--accept-all`, `--select-first`, decision files, environment-variable decisions, or other bypasses that synthesize confirmation without the normal prompt/decision path.

Because stdin answers are explicit input, deterministic package/subprocess tests may pipe exact answers through stdin. That testing capability does not change the semantic rule that Gotcha itself never manufactures a decision.

Ctrl-C exits with process code `130` and never synthesizes a human decision. EOF while a mandatory decision is pending is a non-zero command failure and likewise never synthesizes a decision.

M14 does not widen the semantic availability of delegated core APIs on old runtimes. Existing package behavior on the documented Node floor remains authoritative: `help`/`demo`/`init` preserve minimum-runtime compatibility, while `run`/`verify` fail clearly if an existing delegated advanced API is unavailable/fail-closed on that runtime. M14 must not weaken core authority merely to make an old runtime complete the guided flow.

## 10. Errors and exit behavior

M14 distinguishes expected product outcomes from command failures.

Exit code `0`:

- `init` completed successfully;
- guided run produced a session;
- run completed with `no-active-rules`;
- run completed with `no-survivor`;
- verification completed in any valid semantic terminal state, including rejected/not-verified states.

Exit code `130`:

- explicit Ctrl-C cancellation during guided interaction.

Other non-zero exit:

- malformed CLI arguments;
- missing/unloadable config;
- missing required trusted integration callback;
- session file missing/unreadable/malformed;
- public API boundary rejection;
- provider/transport failure during `run`;
- unexpected local filesystem failure;
- EOF during a required decision.

A valid Gotcha result that finds no survivor or fails verification semantically is not a CLI crash.

No M14 error path performs hidden retries.

## 11. Privacy, credentials, and local-data rules

M14 is local-first.

The CLI MUST NOT:

- scan the user's repository for credentials;
- read arbitrary environment variables itself;
- write provider credentials into config/session/logs;
- print full provider request headers or SDK objects;
- upload session artifacts anywhere except through the caller-owned provider transport as already required by the existing generation APIs.

The caller's trusted `transport` may read environment variables or provider SDK configuration because that is caller-owned integration code.

`verify` performs no provider/model work and therefore does not require provider credentials.

M14 session output may contain sensitive task/evaluation data. The CLI surfaces that fact when the session is written.

## 12. No new security theater

M14 does not extend Gotcha into a general JavaScript sandbox.

The trusted local config module, evaluator, improved evaluator, and transport are allowed to execute local code by design.

M14's safety requirements focus on preserving existing semantic boundaries:

- untrusted model/provider output must still cross M7/M8/M11/M13 validators;
- saved session data must re-enter M10/M12 as untrusted data;
- explicit decisions must remain fresh/current;
- no lazy re-capture of trusted-core authority is introduced by the CLI orchestration layer;
- no M14 convenience cache may become semantic authority;
- terminal/TTY metadata is never treated as proof of a human.

M14 MUST NOT add another primordial/authentication subsystem beside the package/runtime authority already established by M13/Round12.

## 13. Implementation slices

After this architecture is reviewed/locked, implementation proceeds in bounded slices.

### Slice A — CLI foundation and project setup

Scope:

- `init` command;
- shared argument/config loading;
- separate run-config and verify-config diagnostics;
- prompt helper using Node-minimum-compatible `readline`;
- `.gotcha` directory + ignore file;
- unique/non-overwriting stack-safe local session writer/reader primitives;
- help text;
- no model/evaluator execution yet beyond narrow fixtures.

Definition of done:

- existing `demo` behavior unchanged;
- init never overwrites user files;
- generated starter preserves baseline-vs-improved evaluator guidance and exports no active placeholder improved evaluator;
- session writer round-trips deep canonical data without recursive traversal overflow;
- package/install proof covers the new CLI commands;
- Node minimum compatibility preserved for existing/basic CLI surfaces.

### Slice B — Guided contract -> attack -> proposal

Scope:

- construct three structured adapters from one run provider config;
- M7 draft + explicit rule confirmation;
- M8 attack;
- no-active-rules/no-survivor handling;
- choice list from exact bound survivor order;
- explicit source selection with no default;
- M13 proposal generation;
- write exact V1 untrusted session artifact.

Definition of done:

- no semantic logic duplicated from core APIs;
- transport invocation counts remain exactly those owned by delegated APIs;
- no automatic survivor selection or rule acceptance;
- no existing session target is silently overwritten;
- deterministic fake-provider end-to-end CLI proof reaches `session-written`.

### Slice C — Guided remediation verification

Scope:

- `verify` command;
- verify-only config requiring evaluator + improvedEvaluator only;
- session reload as untrusted data;
- current M12 checkpoint preparation;
- exact draft display;
- fresh accept/edit/reject decision;
- M12 completion/M10 verification;
- before/after result presentation;
- public README + five-minute guided example/package proof.

Definition of done:

- modified/replayed session data cannot bypass M10/M12 validation;
- baseline mismatch prevents improved execution;
- rejected draft executes neither evaluator;
- verify performs zero provider/model work;
- verified/regression/source-still-survives/partial states are presented accurately;
- external packed-package CLI proof completes the full guided flow with deterministic fixtures.

## 14. Required proof matrix

M14 implementation is not complete until permanent tests prove at least:

### CLI / init

- existing `demo`, `--help`, and unknown-command behavior remain correct;
- `init` creates only the documented starter paths;
- `init` never overwrites existing config/ignore files;
- generated config is CommonJS-loadable on the documented Node minimum;
- generated config has no active placeholder `improvedEvaluator`;
- no `readline/promises` dependency raises the minimum Node version;
- TTY/non-TTY status never creates a decision;
- piped explicit answers exercise the same decision path as terminal answers;
- Ctrl-C/EOF never synthesizes a decision.

### Config / provider

- missing run-config fields fail before semantic execution;
- verify succeeds with a config containing only evaluator + improvedEvaluator;
- verify does not inspect/require/invoke provider fields;
- `run` creates exactly the three documented structured adapter modes from the same caller transport/model;
- raw transport is never called directly by M14 generation logic;
- provider failure is surfaced with no retry/failover;
- no credentials are persisted in session artifacts by M14.

### Human/caller authority

- contract rule acceptance has no default;
- M7 edit changes only the supported statement field;
- survivor selection has no default and cannot advance on blank/unknown selection;
- displayed survivor IDs equal the first at-most-five exact bound `experiment.baseline.survivorOrderIds`;
- protection acceptance has no default;
- a stored session contains no reusable decision;
- verify always shows a freshly prepared current draft and collects a fresh decision.

### Semantic delegation

- M14 semantic orchestration imports/uses public package entry points rather than private alternate core implementations;
- M14 does not mutate/re-rank M8 attack results;
- no-active-rules stops before M8;
- no-survivor stops before M13;
- selected source is exactly the explicitly selected displayed bound survivor;
- M13 receives exactly one proposal-generation call;
- verify re-enters M12 through `prepareContractQualityLoop()` rather than trusting stored checkpoint state;
- completion delegates once and preserves exact M10/M12 terminal states.

### Session mutation / restart

- session top-level convenience envelope requires exact V1 kind/version/keys;
- default session paths are unique and existing explicit targets are never silently overwritten;
- 12,000-level supported replayable evidence writes/reads without JavaScript recursive traversal overflow;
- edited experiment/source/proposal JSON is rejected by the owning core boundary when invalid;
- JSON that remains valid but changes the current draft is displayed as the changed current draft and requires a new decision;
- malformed/truncated session never reaches evaluator/provider callbacks;
- failed/incomplete serialization is never exposed as the completed target;
- session path defaults under `.gotcha/` and the generated ignore rule excludes it.

### Verification behavior

- baseline `evaluator` and separate `improvedEvaluator` are both required for verification;
- changed baseline behavior triggers the existing baseline mismatch/failure path before improved evaluator execution;
- rejected protection executes neither evaluator;
- baseline positive-control failure/mismatch prevents improved evaluator execution;
- verify performs zero model/provider calls;
- a verified run reports exact before/after counts and caught source;
- regression-detected is never printed as success;
- source-finding-still-survives is never printed as success;
- no valid semantic not-verified/no-survivor state is misclassified as a CLI process crash.

### Compatibility/package

- Node 14.18+ syntax/bootstrap/help/init smoke;
- old-runtime fail-closed behavior for unavailable delegated advanced APIs is preserved rather than weakened;
- supported modern Node guided fixtures;
- supported modern Node focused + full repository suites;
- `npm pack` external consumer can run `gotcha-ai init`, deterministic `run`, and deterministic `verify` using explicit piped prompt answers without repository-internal imports;
- `git diff --check` clean;
- no temporary validation infrastructure remains in the final production tree.

## 15. Definition of done

M14 is complete when a fresh external consumer can install the package and, using a small trusted local integration plus deterministic provider fixture, complete this product flow through the public CLI:

```text
gotcha-ai init
  -> fill in trusted local baseline evaluator/provider integration

gotcha-ai run
  -> review Quality Contract
  -> attack current evaluator
  -> see ranked Gotcha findings from the bound survivor order
  -> explicitly select one survivor
  -> receive declarative protection proposal
  -> save local resumable session

human keeps baseline evaluator behavior available
human implements approved stronger behavior as improvedEvaluator

gotcha-ai verify .gotcha/session-<uuid>.json
  -> requires only baseline + improved evaluator callbacks
  -> revalidate/reprepare current draft
  -> fresh explicit accept/edit/reject
  -> baseline replay
  -> improved replay
  -> accurate before/after result
```

The user experiences one coherent Gotcha loop while the implementation continues to rely on the already-reviewed core APIs for semantic authority.

## 16. Explicit non-goals / next milestone boundary

M14 intentionally does not add:

- first-party OpenAI/Anthropic/Gemini SDK integrations;
- hosted credentials;
- provider auto-discovery;
- evaluator code generation or patch application;
- automatic survivor/protection decisions;
- `--yes` / `--accept-all` / decision-file / environment-variable confirmation bypasses;
- web UI/dashboard;
- persistent run history/database;
- cloud sync/team workspaces;
- telemetry/analytics;
- background attack jobs;
- CI/GitHub Actions product integration;
- general JavaScript sandboxing.

A later provider-proof milestone may add first-party examples/integration helpers around the same structured provider boundary, but M14 keeps the guided product layer provider-neutral and local-first.
