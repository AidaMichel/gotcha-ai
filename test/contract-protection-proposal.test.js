"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks,
  generateContractProtectionProposal,
  prepareContractQualityLoop
} = require("../src");

const INSTRUCTIONS =
  "Propose one specific, testable declarative quality protection for the selected surviving attack.\n" +
  "Return only the required structured proposal data. Bind the proposal to the supplied task, source attack, and rule.\n" +
  "Do not generate executable evaluator code, JavaScript, patches, provider instructions, or an accept/edit/reject decision.\n" +
  "The protection statement must describe what the quality system should enforce.\n" +
  "The rationale must explain why this protection addresses the selected survivor.";

function confirmedContract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [
      {
        id: "time-rule",
        statement: "Time must be 3 PM.",
        kind: "required",
        severity: "major"
      }
    ]
  };
}

async function makeReplayableExperiment() {
  const contract = confirmedContract();
  const result = await runContractAttacks({
    contract,
    input: {
      z: "Schedule the meeting.",
      a: "Keep the approved time."
    },
    expectedOutput: {
      time: "3 PM"
    },
    evaluator() {
      return true;
    },
    generator() {
      return {
        version: 1,
        task: contract.task,
        attacks: [
          {
            id: "wrong-time",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes the approved time.",
            rationale: "Violates the confirmed rule.",
            mutatedOutput: {
              z: "wrong",
              a: "order-preserved"
            },
            scores: {
              realism: 0.9,
              subtlety: 0.8,
              novelty: 0.7,
              fixability: 0.9
            }
          }
        ]
      };
    }
  });

  assert.equal(result.experiment.replayable, true);
  assert.deepEqual(result.experiment.baseline.survivorOrderIds, ["wrong-time"]);
  return result.experiment;
}

function candidate(overrides = {}) {
  return {
    version: 1,
    task: "Return the approved time.",
    sourceAttackId: "wrong-time",
    ruleId: "time-rule",
    protection: {
      statement: "Reject any output whose time is not exactly 3 PM.",
      rationale: "The surviving attack changed the approved time."
    },
    ...overrides
  };
}

function nullPrototypeCandidate() {
  const protection = Object.create(null);
  protection.statement = "Reject any output whose time is not exactly 3 PM.";
  protection.rationale = "The surviving attack changed the approved time.";

  const value = Object.create(null);
  value.version = 1;
  value.task = "Return the approved time.";
  value.sourceAttackId = "wrong-time";
  value.ruleId = "time-rule";
  value.protection = protection;
  return value;
}

test("M13 generates one bound proposal synchronously and keeps the human boundary", async () => {
  const experiment = await makeReplayableExperiment();
  let calls = 0;
  let seenThis = "unset";
  let seenRequest;

  const promise = generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator(request) {
      calls += 1;
      seenThis = this;
      seenRequest = request;
      return candidate();
    }
  });

  assert.equal(calls, 1, "generator must execute before the public API returns");
  assert.equal(seenThis, undefined);
  assert.equal(Object.getPrototypeOf(promise), Promise.prototype);
  assert.deepEqual(Object.keys(seenRequest), [
    "task", "case", "source", "rule", "attack", "instructions"
  ]);
  assert.equal(seenRequest.instructions, INSTRUCTIONS);
  assert.deepEqual(Object.keys(seenRequest.case.input), ["z", "a"]);
  assert.deepEqual(Object.keys(seenRequest.attack.output), ["z", "a"]);
  assert.notStrictEqual(seenRequest.case.input, experiment.case.input);
  assert.notStrictEqual(seenRequest.attack.output, experiment.attacks[0].output);

  const result = await promise;
  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal(Object.isExtensible(result), true);
  assert.deepEqual(Reflect.ownKeys(result), ["version", "kind", "state", "proposal"]);
  for (const key of Reflect.ownKeys(result)) {
    const descriptor = Object.getOwnPropertyDescriptor(result, key);
    assert.equal(descriptor.writable, true);
    assert.equal(descriptor.enumerable, true);
    assert.equal(descriptor.configurable, true);
  }
  assert.equal(result.version, 1);
  assert.equal(result.kind, "contract-protection-proposal-result");
  assert.equal(result.state, "proposal-ready");
  assert.equal(Object.getPrototypeOf(result.proposal), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.proposal.protection), Object.prototype);

  const checkpoint = await prepareContractQualityLoop({
    experiment,
    sourceAttackId: "wrong-time",
    proposal: result.proposal
  });
  assert.equal(checkpoint.state, "awaiting-human-decision");
});

test("M13 validates the complete experiment and source before any generator call", async () => {
  const experiment = await makeReplayableExperiment();
  let calls = 0;
  experiment.baseline.topFindingId = null;

  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() {
        calls += 1;
        return candidate();
      }
    }),
    TypeError
  );
  assert.equal(calls, 0);

  const valid = await makeReplayableExperiment();
  await assert.rejects(
    generateContractProtectionProposal({
      experiment: valid,
      sourceAttackId: "missing",
      generator() {
        calls += 1;
        return candidate({ sourceAttackId: "missing" });
      }
    }),
    TypeError
  );
  assert.equal(calls, 0);
});

test("M13 accepts M11-style null-prototype candidates but normalizes them for M10", async () => {
  const experiment = await makeReplayableExperiment();
  const returned = nullPrototypeCandidate();

  const result = await generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator() {
      return returned;
    }
  });

  assert.equal(Object.getPrototypeOf(returned), null);
  assert.equal(Object.getPrototypeOf(result.proposal), Object.prototype);
  assert.equal(Object.getPrototypeOf(result.proposal.protection), Object.prototype);
  assert.notStrictEqual(result.proposal, returned);
  assert.notStrictEqual(result.proposal.protection, returned.protection);
});

test("M13 rejects proposal rebinding, extras, and accessors", async () => {
  const experiment = await makeReplayableExperiment();

  for (const bad of [
    candidate({ task: "other" }),
    candidate({ sourceAttackId: "other" }),
    candidate({ ruleId: "other" }),
    { ...candidate(), extra: true }
  ]) {
    await assert.rejects(
      generateContractProtectionProposal({
        experiment,
        sourceAttackId: "wrong-time",
        generator() { return bad; }
      }),
      TypeError
    );
  }

  let getterCalls = 0;
  const accessor = candidate();
  Object.defineProperty(accessor.protection, "statement", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return "must not execute";
    }
  });
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return accessor; }
    }),
    TypeError
  );
  assert.equal(getterCalls, 0);
});

test("M13 preserves exact generator throw and Promise rejection identity", async () => {
  const experiment = await makeReplayableExperiment();
  const syncReason = { code: "sync-generator" };
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { throw syncReason; }
    }),
    (error) => error === syncReason
  );

  const asyncReason = { code: "async-generator" };
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return Promise.reject(asyncReason); }
    }),
    (error) => error === asyncReason
  );
});

test("M13 observes accepted native Promises once and rejects unsafe async wrappers", async () => {
  const experiment = await makeReplayableExperiment();
  const result = await generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator() { return Promise.resolve(nullPrototypeCandidate()); }
  });
  assert.equal(result.state, "proposal-ready");

  let thenGetterCalls = 0;
  const thenable = candidate();
  Object.defineProperty(thenable, "then", {
    configurable: true,
    enumerable: true,
    get() {
      thenGetterCalls += 1;
      return () => {};
    }
  });
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return thenable; }
    }),
    TypeError
  );
  assert.equal(thenGetterCalls, 0);

  const unshieldable = Promise.resolve(candidate());
  Object.defineProperty(unshieldable, "constructor", {
    value: Promise,
    writable: true,
    enumerable: false,
    configurable: false
  });
  await assert.rejects(
    generateContractProtectionProposal({
      experiment,
      sourceAttackId: "wrong-time",
      generator() { return unshieldable; }
    }),
    TypeError
  );
});

test("M13 capture is authoritative before generator-side caller mutation", async () => {
  const experiment = await makeReplayableExperiment();
  const originalTask = experiment.task;

  const result = await generateContractProtectionProposal({
    experiment,
    sourceAttackId: "wrong-time",
    generator(request) {
      experiment.task = "mutated after capture";
      assert.equal(request.task, originalTask);
      return candidate();
    }
  });

  assert.equal(result.proposal.task, originalTask);
});

test("M13 fails closed if generator poisons the prototype baseline", async () => {
  const experiment = await makeReplayableExperiment();
  try {
    await assert.rejects(
      generateContractProtectionProposal({
        experiment,
        sourceAttackId: "wrong-time",
        generator() {
          Object.prototype.toJSON = function poisoned() { return "x"; };
          return candidate();
        }
      }),
      TypeError
    );
  } finally {
    delete Object.prototype.toJSON;
  }
});