"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const utilTypes = require("node:util").types;
const vm = require("node:vm");

const {
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection,
  prepareContractQualityLoop,
  completeContractQualityLoop
} = require("../src");

const remediationModule = require("../src/contract-remediation");

function contract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved time.",
    rules: [{
      id: "time-rule",
      statement: "Time must be 3 PM.",
      kind: "required",
      severity: "major"
    }]
  };
}

function historicalEvaluator(output) {
  if (output.time === "5 PM") {
    return false;
  }
  return true;
}

function improvedEvaluator(output) {
  return output.time === "3 PM";
}

async function makeExperiment() {
  const confirmed = contract();
  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "Schedule the meeting." },
    expectedOutput: { time: "3 PM" },
    evaluator: historicalEvaluator,
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: [
          {
            id: "attack-a",
            ruleId: "time-rule",
            type: "wrong-time",
            description: "Changes the approved time.",
            rationale: "Violates the confirmed rule.",
            mutatedOutput: { time: "4 PM" },
            scores: {
              realism: 0.9,
              subtlety: 0.9,
              novelty: 0.9,
              fixability: 0.9
            }
          },
          {
            id: "attack-b",
            ruleId: "time-rule",
            type: "other-time",
            description: "Changes the approved time differently.",
            rationale: "Also violates the confirmed rule.",
            mutatedOutput: { time: "5 PM" },
            scores: {
              realism: 0.4,
              subtlety: 0.4,
              novelty: 0.4,
              fixability: 0.4
            }
          }
        ]
      };
    }
  });

  assert.equal(result.experiment.replayable, true);
  assert.deepEqual(result.experiment.baseline.survivorOrderIds, ["attack-a"]);
  return result.experiment;
}

function proposal() {
  return {
    version: 1,
    task: "Return the approved time.",
    sourceAttackId: "attack-a",
    ruleId: "time-rule",
    protection: {
      statement: "Reject any output whose time is not exactly 3 PM.",
      rationale: "The source survivor changed the approved time."
    }
  };
}

async function makeCheckpoint() {
  const experiment = await makeExperiment();
  return prepareContractQualityLoop({
    experiment,
    sourceAttackId: "attack-a",
    proposal: proposal()
  });
}

function assertOrdinaryProperty(record, key, expectedValue) {
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  assert.ok(descriptor);
  assert.equal(descriptor.value, expectedValue);
  assert.equal(descriptor.writable, true);
  assert.equal(descriptor.enumerable, true);
  assert.equal(descriptor.configurable, true);
  assert.equal(descriptor.get, undefined);
  assert.equal(descriptor.set, undefined);
}

function assertHiddenFreshPromise(promise) {
  assert.equal(utilTypes.isPromise(promise), true);
  assert.equal(Object.getPrototypeOf(promise), Promise.prototype);
  assert.equal(Object.isExtensible(promise), true);
  assert.equal(Object.getOwnPropertyDescriptor(promise, "constructor"), undefined);
}

test("prepare returns the exact awaiting-confirmation checkpoint surface", async () => {
  const experiment = await makeExperiment();
  const promise = prepareContractQualityLoop({
    experiment,
    sourceAttackId: "attack-a",
    proposal: proposal()
  });

  assertHiddenFreshPromise(promise);

  const checkpoint = await promise;
  assert.equal(Object.getPrototypeOf(checkpoint), null);
  assert.equal(Object.isExtensible(checkpoint), true);
  assert.deepEqual(Object.keys(checkpoint), [
    "version",
    "kind",
    "state",
    "draft"
  ]);
  assertOrdinaryProperty(checkpoint, "version", 1);
  assertOrdinaryProperty(checkpoint, "kind", "contract-quality-loop-checkpoint");
  assertOrdinaryProperty(checkpoint, "state", "awaiting-confirmation");
  assert.equal(checkpoint.draft.status, "draft");
  assert.equal(checkpoint.draft.source.attackId, "attack-a");
});

test("prepare captures proposal authority before caller mutation", async () => {
  const experiment = await makeExperiment();
  const suppliedProposal = proposal();
  const originalStatement = suppliedProposal.protection.statement;

  const promise = prepareContractQualityLoop({
    experiment,
    sourceAttackId: "attack-a",
    proposal: suppliedProposal
  });

  suppliedProposal.protection.statement = "mutated after invocation";
  const checkpoint = await promise;
  assert.equal(checkpoint.draft.protection.statement, originalStatement);
});

test("prepare outer boundary rejects malformed surfaces without executing accessors", async () => {
  const experiment = await makeExperiment();
  const base = {
    experiment,
    sourceAttackId: "attack-a",
    proposal: proposal()
  };

  await assert.rejects(
    prepareContractQualityLoop({ ...base, extra: true }),
    TypeError
  );

  await assert.rejects(
    prepareContractQualityLoop(Object.freeze({ ...base })),
    TypeError
  );

  const foreign = vm.runInNewContext("({ experiment: null, sourceAttackId: 'attack-a', proposal: null })");
  await assert.rejects(
    prepareContractQualityLoop(foreign),
    TypeError
  );

  let getterCalls = 0;
  const accessor = {};
  Object.defineProperty(accessor, "experiment", {
    get() {
      getterCalls += 1;
      return experiment;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(accessor, "sourceAttackId", {
    value: "attack-a",
    writable: true,
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(accessor, "proposal", {
    value: proposal(),
    writable: true,
    enumerable: true,
    configurable: true
  });
  await assert.rejects(prepareContractQualityLoop(accessor), TypeError);
  assert.equal(getterCalls, 0);

  let proxyTraps = 0;
  const proxied = new Proxy(base, {
    get() {
      proxyTraps += 1;
      return undefined;
    },
    ownKeys() {
      proxyTraps += 1;
      return [];
    }
  });
  await assert.rejects(prepareContractQualityLoop(proxied), TypeError);
  assert.equal(proxyTraps, 0);
});

test("prototype-rewritten covered brands reject at the prepare boundary", async () => {
  const branded = new Date();
  Object.setPrototypeOf(branded, Object.prototype);
  Object.defineProperties(branded, {
    experiment: {
      value: await makeExperiment(),
      writable: true,
      enumerable: true,
      configurable: true
    },
    sourceAttackId: {
      value: "attack-a",
      writable: true,
      enumerable: true,
      configurable: true
    },
    proposal: {
      value: proposal(),
      writable: true,
      enumerable: true,
      configurable: true
    }
  });

  await assert.rejects(prepareContractQualityLoop(branded), TypeError);
});

test("JSON-reconstructed checkpoint is structurally accepted unconditionally", async () => {
  const checkpoint = await makeCheckpoint();
  const reconstructed = JSON.parse(JSON.stringify(checkpoint));
  let evaluatorCalls = 0;

  const result = await completeContractQualityLoop({
    checkpoint: reconstructed,
    decision: { type: "reject" },
    evaluator() {
      evaluatorCalls += 1;
      return true;
    },
    improvedEvaluator() {
      evaluatorCalls += 1;
      return true;
    }
  });

  assert.equal(result.state, "rejected");
  assert.equal(result.verification, null);
  assert.equal(evaluatorCalls, 0);
});

test("checkpoint wrapper predicate rejects alternate surfaces before confirmation", async () => {
  const checkpoint = await makeCheckpoint();
  const frozen = Object.freeze(JSON.parse(JSON.stringify(checkpoint)));
  await assert.rejects(
    completeContractQualityLoop({
      checkpoint: frozen,
      decision: { type: "reject" },
      evaluator: historicalEvaluator,
      improvedEvaluator
    }),
    TypeError
  );

  const reordered = {
    state: "awaiting-confirmation",
    version: 1,
    kind: "contract-quality-loop-checkpoint",
    draft: checkpoint.draft
  };
  await assert.rejects(
    completeContractQualityLoop({
      checkpoint: reordered,
      decision: { type: "reject" },
      evaluator: historicalEvaluator,
      improvedEvaluator
    }),
    TypeError
  );

  const custom = JSON.parse(JSON.stringify(checkpoint));
  Object.setPrototypeOf(custom, { marker: true });
  await assert.rejects(
    completeContractQualityLoop({
      checkpoint: custom,
      decision: { type: "reject" },
      evaluator: historicalEvaluator,
      improvedEvaluator
    }),
    TypeError
  );
});

test("malformed nested draft is rejected by M10 rather than trusted by the wrapper", async () => {
  const checkpoint = await makeCheckpoint();
  const reconstructed = JSON.parse(JSON.stringify(checkpoint));
  reconstructed.draft.status = "confirmed";
  let calls = 0;

  await assert.rejects(
    completeContractQualityLoop({
      checkpoint: reconstructed,
      decision: { type: "accept" },
      evaluator() {
        calls += 1;
        return true;
      },
      improvedEvaluator() {
        calls += 1;
        return true;
      }
    }),
    TypeError
  );
  assert.equal(calls, 0);
});

test("reject stops the quality loop before verification or evaluator execution", async () => {
  const checkpoint = await makeCheckpoint();
  let calls = 0;
  const result = await completeContractQualityLoop({
    checkpoint,
    decision: { type: "reject" },
    evaluator() {
      calls += 1;
      return true;
    },
    improvedEvaluator() {
      calls += 1;
      return true;
    }
  });

  assert.equal(Object.getPrototypeOf(result), null);
  assert.deepEqual(Object.keys(result), [
    "version",
    "kind",
    "state",
    "protection",
    "verification"
  ]);
  assert.equal(result.state, "rejected");
  assert.equal(result.protection.status, "rejected");
  assert.equal(result.verification, null);
  assert.equal(calls, 0);
});

test("accept delegates to M10 verification and mirrors its state", async () => {
  const checkpoint = await makeCheckpoint();
  const result = await completeContractQualityLoop({
    checkpoint,
    decision: { type: "accept" },
    evaluator: historicalEvaluator,
    improvedEvaluator
  });

  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal(result.kind, "contract-quality-loop-result");
  assert.equal(result.protection.status, "confirmed");
  assert.equal(result.state, "verified");
  assert.equal(result.state, result.verification.state);
  assert.equal(result.verification.verificationPassed, true);
  assert.deepEqual(result.verification.eliminatedAttackIds, ["attack-a"]);
  assert.deepEqual(result.verification.regressionAttackIds, []);
});

test("edit authority is captured synchronously and only the original human edit reaches M10", async () => {
  const checkpoint = await makeCheckpoint();
  const decision = {
    type: "edit",
    statement: "Require the returned time to equal 3 PM exactly."
  };
  const original = decision.statement;

  const promise = completeContractQualityLoop({
    checkpoint,
    decision,
    evaluator: historicalEvaluator,
    improvedEvaluator
  });

  decision.statement = "mutated after invocation";
  const result = await promise;
  assert.equal(result.protection.status, "confirmed");
  assert.equal(result.protection.protection.statement, original);
  assert.equal(result.state, "verified");
});

test("complete captures evaluator identities before confirmation settles", async () => {
  const checkpoint = await makeCheckpoint();
  let historicalCalls = 0;
  let improvedCalls = 0;

  const evaluator = (output) => {
    historicalCalls += 1;
    return historicalEvaluator(output);
  };
  const improved = (output) => {
    improvedCalls += 1;
    return improvedEvaluator(output);
  };

  const options = {
    checkpoint,
    decision: { type: "accept" },
    evaluator,
    improvedEvaluator: improved
  };
  const promise = completeContractQualityLoop(options);
  options.evaluator = () => false;
  options.improvedEvaluator = () => true;

  const result = await promise;
  assert.equal(result.state, "verified");
  assert.ok(historicalCalls > 0);
  assert.ok(improvedCalls > 0);
});

test("complete outer boundary rejects malformed option surfaces", async () => {
  const checkpoint = await makeCheckpoint();
  const base = {
    checkpoint,
    decision: { type: "reject" },
    evaluator: historicalEvaluator,
    improvedEvaluator
  };

  await assert.rejects(
    completeContractQualityLoop({ ...base, extra: true }),
    TypeError
  );
  await assert.rejects(
    completeContractQualityLoop(Object.freeze({ ...base })),
    TypeError
  );
  await assert.rejects(
    completeContractQualityLoop({
      checkpoint,
      decision: { type: "reject" },
      evaluator: {},
      improvedEvaluator
    }),
    TypeError
  );
});

test("M12 retains the three M10 entry-point identities captured at module initialization", async () => {
  const checkpoint = await makeCheckpoint();
  const originals = {
    draftContractProtection: remediationModule.draftContractProtection,
    confirmContractProtection: remediationModule.confirmContractProtection,
    verifyContractProtection: remediationModule.verifyContractProtection
  };

  remediationModule.draftContractProtection = () => {
    throw new Error("late draft replacement executed");
  };
  remediationModule.confirmContractProtection = () => {
    throw new Error("late confirm replacement executed");
  };
  remediationModule.verifyContractProtection = () => {
    throw new Error("late verify replacement executed");
  };

  try {
    const experiment = await makeExperiment();
    const prepared = await prepareContractQualityLoop({
      experiment,
      sourceAttackId: "attack-a",
      proposal: proposal()
    });
    assert.equal(prepared.state, "awaiting-confirmation");

    const result = await completeContractQualityLoop({
      checkpoint,
      decision: { type: "accept" },
      evaluator: historicalEvaluator,
      improvedEvaluator
    });
    assert.equal(result.state, "verified");
  } finally {
    remediationModule.draftContractProtection = originals.draftContractProtection;
    remediationModule.confirmContractProtection = originals.confirmContractProtection;
    remediationModule.verifyContractProtection = originals.verifyContractProtection;
  }
});

test("all three M10 entry points satisfy the hidden fresh-Promise integration invariant", async () => {
  const functions = [
    draftContractProtection,
    confirmContractProtection,
    verifyContractProtection
  ];

  for (let index = 0; index < functions.length; index += 1) {
    const promise = functions[index]({});
    assertHiddenFreshPromise(promise);
    await assert.rejects(promise, TypeError);
  }
});

test("M12 Promise observation does not execute hostile inherited constructor or species hooks", async () => {
  const experiment = await makeExperiment();
  const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
  const constructorDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, "constructor");
  let m12SpeciesCalls = 0;
  let m12ConstructorCalls = 0;

  Object.defineProperty(Promise, Symbol.species, {
    get() {
      if (String(new Error().stack).includes("contract-quality-loop.js")) {
        m12SpeciesCalls += 1;
      }
      return Promise;
    },
    configurable: true
  });
  Object.defineProperty(Promise.prototype, "constructor", {
    get() {
      if (String(new Error().stack).includes("contract-quality-loop.js")) {
        m12ConstructorCalls += 1;
      }
      return Promise;
    },
    configurable: true
  });

  try {
    const checkpoint = await prepareContractQualityLoop({
      experiment,
      sourceAttackId: "attack-a",
      proposal: proposal()
    });
    const result = await completeContractQualityLoop({
      checkpoint,
      decision: { type: "reject" },
      evaluator: historicalEvaluator,
      improvedEvaluator
    });
    assert.equal(result.state, "rejected");
    assert.equal(m12SpeciesCalls, 0);
    assert.equal(m12ConstructorCalls, 0);
  } finally {
    Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
    Object.defineProperty(Promise.prototype, "constructor", constructorDescriptor);
  }
});

test("public fulfillment roots ignore inherited Object.prototype.then", async () => {
  const experiment = await makeExperiment();
  const previous = Object.getOwnPropertyDescriptor(Object.prototype, "then");
  let thenCalls = 0;

  Object.defineProperty(Object.prototype, "then", {
    value(resolve) {
      thenCalls += 1;
      resolve("hijacked");
    },
    writable: true,
    enumerable: false,
    configurable: true
  });

  try {
    const checkpoint = await prepareContractQualityLoop({
      experiment,
      sourceAttackId: "attack-a",
      proposal: proposal()
    });
    assert.equal(Object.getPrototypeOf(checkpoint), null);

    const result = await completeContractQualityLoop({
      checkpoint,
      decision: { type: "accept" },
      evaluator: historicalEvaluator,
      improvedEvaluator
    });
    assert.equal(Object.getPrototypeOf(result), null);
    assert.equal(result.state, "verified");
    assert.equal(thenCalls, 0);
  } finally {
    if (previous === undefined) {
      delete Object.prototype.then;
    } else {
      Object.defineProperty(Object.prototype, "then", previous);
    }
  }
});

test("boundary failures use the TypeError captured before later global replacement", async () => {
  const OriginalTypeError = global.TypeError;
  global.TypeError = function ReplacementTypeError() {
    return new Error("replacement TypeError executed");
  };

  let caught;
  try {
    try {
      await prepareContractQualityLoop({});
    } catch (error) {
      caught = error;
    }
  } finally {
    global.TypeError = OriginalTypeError;
  }

  assert.ok(caught instanceof OriginalTypeError);
  assert.equal(Object.getPrototypeOf(caught), OriginalTypeError.prototype);
});
