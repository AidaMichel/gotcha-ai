# M14 — Guided V0 Experience

Status: Architecture Draft — Revision 1
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
gotcha-ai run [--config path]
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

It does not verify remediation because the user has not yet supplied the changed evaluator.

The final successful `run` message tells the user exactly:

1. what finding was selected;
2. what declarative protection was proposed;
3. where the local session file was written;
4. that the evaluator must be changed by the human/caller, not by Gotcha;
5. the exact `gotcha-ai verify ...` command to continue.

### 3.3 `gotcha-ai verify`

`verify` resumes from a saved non-authoritative session after the user has supplied an `improvedEvaluator` in the trusted local integration module.

It performs:

```text
LOAD CURRENT INTEGRATION
  -> LOAD UNTRUSTED SESSION DATA
  -> RE-PREPARE CURRENT M12 CHECKPOINT
  -> SHOW EXACT CURRENT DRAFT
  -> FRESH HUMAN ACCEPT / EDIT / REJECT
  -> COMPLETE M12/M10 QUALITY LOOP
  -> RE-ATTACK / REPORT IMPROVEMENT
```

A session never stores a reusable human decision. A resumed verification always displays the exact current draft and obtains a fresh decision in the current process before `completeContractQualityLoop()`.

This preserves M12's human reinspection requirement when a checkpoint/proposal crosses mutable storage.

## 4. Trusted local integration module

The default integration path is:

```text
./gotcha.config.js
```

`--config path` may select another local CommonJS module.

The integration module is **trusted local integration code**, just like the evaluator/generator callbacks already documented by Gotcha. Loading it may execute arbitrary JavaScript. M14 does not claim to sandbox a malicious config module.

The V1 config contract is conceptually:

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
    // current evaluator
    return true;
  },

  provider: {
    model: "caller-owned-model-name",

    async transport(request) {
      // caller/provider integration
      // credentials remain caller-owned, normally from environment variables
    }
  },

  // Added by the user only after applying the proposed protection:
  improvedEvaluator(output) {
    return true;
  }
};
```

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

For `verify`, `improvedEvaluator` is additionally required.

M14 may reject clearly malformed/missing config fields early for product ergonomics, but the existing public APIs remain the authoritative validators for task/examples/contract/attack/proposal/evaluator/provider semantics.

### 4.1 Provider-neutral adapter construction

M14 never defines provider-specific request formats.

From the one caller-owned `{ model, transport }`, `run` creates three M11 adapters:

```text
mode = "quality-contract"
mode = "contract-attacks"
mode = "contract-protection"
```

Those adapters are then supplied to the existing M7/M8/M13 APIs.

M14 MUST NOT call the raw `transport` directly for model work.

M11 remains authoritative for:

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
no-survivor
stopped
failed
```

The CLI may display friendly phase names, but it must not silently skip a semantic phase.

### 5.1 Contract drafting

`run` calls exactly one M7 draft operation with:

```text
task = config.task
examples = config.examples
generator = M11 quality-contract adapter
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

For `edit`, M14 collects only fields supported by the existing M7 confirmation API; it does not invent additional edit semantics.

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
generator = M11 contract-attacks adapter
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

### 5.5 Finding presentation

For a run with survivors, the CLI presents up to the first five ranked replayable survivors in M8 rank order.

Each displayed finding includes only evidence already available from the M8 result/embedded contract, such as:

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

If more than five replayable survivors exist, the CLI may say that additional findings exist, but V1 source selection is limited to the displayed set. This is a product-display constraint, not a change to M8 ranking.

### 5.6 Explicit survivor selection

The human must explicitly select one displayed survivor.

There is no default survivor, no automatic first-item selection, and no silent use of `topFinding`.

Blank input, invalid rank, or unknown attack ID does not advance the state.

The selected exact `attack.id` becomes M13 `sourceAttackId`.

### 5.7 Protection proposal

M14 calls exactly one `generateContractProtectionProposal()` using:

```text
experiment = M8 replayable experiment
sourceAttackId = explicit human-selected attack id
generator = M11 contract-protection adapter
```

M14 then displays the returned declarative proposal as a proposal, never as an applied fix.

M14 does not call M12 completion during `run`.

## 6. Session artifact: convenience data, never authority

After proposal generation, `run` writes one local JSON session artifact under `.gotcha/` by default.

The session is intentionally small and contains exactly the data required to reconstruct the next trusted boundary:

```js
{
  version: 1,
  kind: "gotcha-guided-session",
  experiment,
  sourceAttackId,
  proposal
}
```

No human confirmation decision is stored.

No evaluator/generator/transport function is serialized.

No provider credential, environment variable, API token, request header, raw transport object, or model-provider SDK object is intentionally persisted by M14.

The session can contain task text, examples/contract evidence carried by the experiment, user input, expected output, generated attack data, and proposal text. The CLI MUST tell the user that the session contains local evaluation evidence and should be treated as potentially sensitive project data.

### 6.1 Storage safety

Default session location:

```text
.gotcha/session-v1.json
```

V1 keeps one current session rather than inventing a session registry/history product.

Writing uses a same-directory temporary file followed by rename so a process interruption does not intentionally replace a valid session with a partial JSON file.

Where supported by Node/filesystem semantics, the created file should request owner-only permissions (`0600`). Permission failure that still permits the write does not create a false claim that the OS enforced secrecy; docs state this as best effort.

The default `.gotcha/.gitignore` prevents generated session files from being committed accidentally when the normal init path is used.

### 6.2 Session trust rule

The session is **untrusted mutable storage**.

On `verify`, M14 parses it as data and passes its current `experiment`, `sourceAttackId`, and `proposal` into `prepareContractQualityLoop()`.

M12/M10 then independently revalidate replayability, source binding, proposal shape, ownership/wire invariants, and the current draft.

M14 MUST NOT mark a session trusted merely because:

- M14 wrote it earlier;
- its JSON parsed successfully;
- it contains a known `kind`/`version`;
- its file path is inside `.gotcha/`;
- a previous process already validated its contents.

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

### 7.1 Current integration requirements

`verify` loads the current trusted integration module and requires:

```text
evaluator
improvedEvaluator
```

The baseline `evaluator` is replayed first by M10 and must reproduce the bound historical result. This existing baseline identity gate protects against verifying a changed baseline as if it were the original experiment.

The improved evaluator is never used if baseline replay fails/mismatches or if the human rejects the draft.

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

The fresh checkpoint's exact current draft is then shown to the human.

This avoids treating a serialized historical checkpoint as proof of what the human is currently seeing.

### 7.3 Fresh protection decision

The CLI supports the exact M10/M12 protection decisions:

```text
accept
edit
reject
```

There is no default accept.

For edit, only the exact existing protection edit fields are collected.

If the human rejects, M14 calls the existing completion/confirmation path required by M12 and then stops at the existing rejected semantic state. Neither evaluator may be executed in a rejected completion.

If the human accepts/edits, M14 calls exactly one `completeContractQualityLoop()` with:

```text
checkpoint = freshly prepared checkpoint
decision = fresh human decision
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

## 9. Prompt/input behavior

M14 uses Node's existing callback/event-based `readline` surface compatible with the package's documented Node minimum; it MUST NOT require `node:readline/promises` or a newer runtime merely for CLI convenience.

Prompts are local terminal I/O only.

V1 assumes an interactive TTY for `run` and `verify` human decisions. If stdin/stdout cannot support the required guided interaction, the command exits with a clear message rather than auto-deciding.

Ctrl-C / EOF stops without synthesizing a human decision.

Human confirmation prompts MUST NOT have hidden/default acceptance.

## 10. Errors and exit behavior

M14 distinguishes expected product outcomes from command failures.

Exit code `0`:

- `init` completed successfully;
- guided run produced a session;
- run completed with `no-active-rules`;
- run completed with `no-survivor`;
- verification completed in any valid semantic terminal state, including rejected/not-verified states.

Non-zero exit:

- malformed CLI arguments;
- missing/unloadable config;
- missing required trusted integration callback;
- session file missing/unreadable/malformed;
- public API boundary rejection;
- provider/transport failure;
- unexpected local filesystem failure;
- unsupported non-interactive use for a prompt-requiring command.

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

M14 session output may contain sensitive task/evaluation data. The CLI surfaces that fact when the session is written.

## 12. No new security theater

M14 does not extend Gotcha into a general JavaScript sandbox.

The trusted local config module, evaluator, improved evaluator, and transport are allowed to execute local code by design.

M14's safety requirements focus on preserving existing semantic boundaries:

- untrusted model/provider output must still cross M7/M8/M11/M13 validators;
- saved session data must re-enter M10/M12 as untrusted data;
- human decisions must remain explicit and fresh;
- no lazy re-capture of trusted-core authority is introduced by the CLI orchestration layer;
- no M14 convenience cache may become semantic authority.

M14 MUST NOT add another primordial/authentication subsystem beside the package/runtime authority already established by M13/Round12.

## 13. Implementation slices

After this architecture is reviewed/locked, implementation proceeds in bounded slices.

### Slice A — CLI foundation and project setup

Scope:

- `init` command;
- shared argument/config loading;
- trusted local config shape diagnostics;
- interactive prompt helper using Node-minimum-compatible `readline`;
- `.gotcha` directory + ignore file;
- atomic local session writer/reader primitives;
- help text;
- no model/evaluator execution yet beyond narrow fixtures.

Definition of done:

- existing `demo` behavior unchanged;
- init is idempotent only when nothing would be overwritten;
- package/install proof covers the new CLI commands;
- Node minimum compatibility preserved.

### Slice B — Guided contract -> attack -> proposal

Scope:

- construct three M11 adapters from one provider config;
- M7 draft + explicit human rule confirmation;
- M8 attack;
- no-survivor handling;
- ranked finding presentation;
- explicit source selection with no default;
- M13 proposal generation;
- write exact V1 untrusted session artifact.

Definition of done:

- no semantic logic duplicated from core APIs;
- transport invocation counts remain exactly those owned by the delegated APIs;
- no automatic survivor selection or human acceptance;
- deterministic fake-provider end-to-end CLI proof reaches `session-written`.

### Slice C — Guided human remediation verification

Scope:

- `verify` command;
- session reload as untrusted data;
- current M12 checkpoint preparation;
- exact draft display;
- fresh accept/edit/reject decision;
- M12 completion/M10 verification;
- before/after result presentation;
- public README + five-minute guided example/package proof.

Definition of done:

- modified/replayed session data cannot bypass M10/M12 validation;
- rejected draft executes neither evaluator;
- baseline mismatch prevents improved evaluator execution;
- verified/regression/source-still-survives/partial states are presented accurately;
- external packed-package CLI proof completes the full guided flow with deterministic fixtures.

## 14. Required proof matrix

M14 implementation is not complete until permanent tests prove at least:

### CLI / init

- existing `demo`, `--help`, and unknown-command behavior remain correct;
- `init` creates only the documented starter paths;
- `init` never overwrites existing config/ignore files;
- generated config is CommonJS-loadable on the documented Node minimum;
- no `readline/promises` dependency raises the minimum Node version.

### Config / provider

- missing config fields fail before semantic execution;
- `run` creates exactly the three documented M11 modes from the same caller transport/model;
- raw transport is never called directly by M14 generation logic;
- provider failure is surfaced with no retry/failover;
- no credentials are persisted in session artifacts by M14.

### Human authority

- contract rule acceptance has no default;
- reject/edit/accept decisions map only to existing M7 semantics;
- survivor selection has no default and cannot advance on blank/unknown selection;
- protection acceptance has no default;
- a stored session contains no reusable human decision;
- verify always shows a freshly prepared current draft and collects a fresh decision.

### Semantic delegation

- M14 does not mutate/re-rank M8 attack results;
- no-survivor stops before M13;
- selected source is exactly the human-selected displayed replayable survivor;
- M13 receives exactly one proposal-generation call;
- verify re-enters M12 through `prepareContractQualityLoop()` rather than trusting stored checkpoint state;
- completion delegates once and preserves exact M10/M12 terminal states.

### Session mutation / restart

- edited experiment/source/proposal JSON is rejected by the owning core boundary when invalid;
- JSON that remains valid but changes the current draft is displayed as the changed current draft and requires a new human decision;
- malformed/truncated session never reaches evaluator/provider callbacks;
- atomic write failure does not intentionally destroy the prior complete session;
- session path defaults under `.gotcha/` and the generated ignore rule excludes it.

### Verification behavior

- rejected protection executes neither evaluator;
- baseline positive-control failure/mismatch prevents improved evaluator execution;
- a verified run reports exact before/after counts and caught source;
- regression-detected is never printed as success;
- source-finding-still-survives is never printed as success;
- no valid semantic not-verified/no-survivor state is misclassified as a CLI process crash.

### Compatibility/package

- Node 14.18+ syntax/bootstrap/help/init smoke;
- Node 16+ interactive guided fixtures;
- supported modern Node focused + full repository suites;
- `npm pack` external consumer can run `gotcha-ai init`, deterministic `run`, and deterministic `verify` without repository-internal imports;
- `git diff --check` clean;
- no temporary validation infrastructure remains in the final production tree.

## 15. Definition of done

M14 is complete when a fresh external consumer can install the package and, using a small trusted local integration plus deterministic provider fixture, complete this product flow through the public CLI:

```text
gotcha-ai init
  -> fill in trusted local evaluator/provider integration

gotcha-ai run
  -> review Quality Contract
  -> attack current evaluator
  -> see ranked Gotcha findings
  -> explicitly select one survivor
  -> receive declarative protection proposal
  -> save local resumable session

human changes evaluator implementation

gotcha-ai verify .gotcha/session-v1.json
  -> revalidate/reprepare current draft
  -> fresh human accept/edit/reject
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
- web UI/dashboard;
- persistent run history/database;
- cloud sync/team workspaces;
- telemetry/analytics;
- background attack jobs;
- CI/GitHub Actions product integration;
- arbitrary non-interactive decision scripting;
- general JavaScript sandboxing.

A later provider-proof milestone may add first-party examples/integration helpers around the same M11 transport boundary, but M14 keeps the guided product layer provider-neutral and local-first.