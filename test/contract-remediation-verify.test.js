"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks,
  draftContractProtection,
  confirmContractProtection,
  verifyContractProtection
} = require("../src");

function contract() {
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

function historicalEvaluator(output) {
  if (output.time === "5 PM") {
    return false;
  }
  return true;
}

async function confirmedProtection() {
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

  const draft = await draftContractProtection({
    experiment: result.experiment,
    sourceAttackId: "attack-a",
    proposal: {
      version: 1,
      task: confirmed.task,
      sourceAttackId: "attack-a",
      ruleId: "time-rule",
      protection: {
        statement: "Reject any output whose time is not exactly 3 PM.",
        rationale: "The source survivor changed the approved time."
      }
    }
  });

  return confirmContractProtection({
    draft,
    decision: { type: "accept" }
  });
}

function assertCanonicalResult(result) {
  assert.deepEqual(Object.keys(result), [
    "version",
    "kind",
    "state",
    "verificationPassed",
    "task",
    "sourceAttackId",
    "sourceRuleId",
    "protection",
    "baselinePositiveControlPassed",
    "improvedPositiveControlPassed",
    "baseline",
    "after",
    "baselineMismatchAttackIds",
    "eliminatedAttackIds",
    "regressionAttackIds",
    "sourceFindingCaught",
    "improvement",
    "failureReasons"
  ]);
  assert.equal(result.version, 1);
  assert.equal(result.kind, "contract-protection-verification");
  assert.notEqual(result.baselineMismatchAttackIds, result.eliminatedAttackIds);
  assert.notEqual(result.eliminatedAttackIds, result.regressionAttackIds);
}

test("verifyContractProtection verifies source elimination with no regression", async () => {
  const protection = await confirmedProtection();
  const promise = verifyContractProtection({
    protection,
    evaluator: historicalEvaluator,
    improvedEvaluator(output) {
      return output.time === "3 PM";
    }
  });

  assert.equal(Object.getPrototypeOf(promise), Promise.prototype);
  const result = await promise;
  assertCanonicalResult(result);
  assert.equal(result.state, "verified");
  assert.equal(result.verificationPassed, true);
  assert.equal(result.baselinePositiveControlPassed, true);
  assert.equal(result.improvedPositiveControlPassed, true);
  assert.deepEqual(result.baseline.survivorOrderIds, ["attack-a"]);
  assert.deepEqual(result.after.survivorOrderIds, []);
  assert.deepEqual(result.eliminatedAttackIds, ["attack-a"]);
  assert.deepEqual(result.regressionAttackIds, []);
  assert.equal(result.sourceFindingCaught, true);
  assert.equal(result.improvement, 1);
  assert.deepEqual(result.failureReasons, []);
});

test("baseline mismatch gates improved evaluator completely", async () => {
  const protection = await confirmedProtection();
  let improvedCalls = 0;
  const result = await verifyContractProtection({
    protection,
    evaluator(output) {
      return output.time === "3 PM";
    },
    improvedEvaluator() {
      improvedCalls += 1;
      return true;
    }
  });

  assert.equal(result.state, "baseline-mismatch");
  assert.equal(result.verificationPassed, false);
  assert.deepEqual(result.baselineMismatchAttackIds, ["attack-a"]);
  assert.equal(result.after, null);
  assert.equal(result.improvedPositiveControlPassed, null);
  assert.equal(improvedCalls, 0);
});

test("baseline positive-control false resolves the exact partial state", async () => {
  const protection = await confirmedProtection();
  let improvedCalls = 0;
  const result = await verifyContractProtection({
    protection,
    evaluator() {
      return false;
    },
    improvedEvaluator() {
      improvedCalls += 1;
      return true;
    }
  });

  assert.equal(result.state, "baseline-positive-control-failed");
  assert.equal(result.baselinePositiveControlPassed, false);
  assert.equal(result.improvedPositiveControlPassed, null);
  assert.equal(result.baseline, null);
  assert.equal(result.after, null);
  assert.equal(result.improvement, null);
  assert.deepEqual(result.failureReasons, ["baseline-positive-control-failed"]);
  assert.equal(improvedCalls, 0);
});

test("baseline callback throw resolves baseline-execution-failed", async () => {
  const protection = await confirmedProtection();
  const result = await verifyContractProtection({
    protection,
    evaluator() {
      throw new Error("boom");
    },
    improvedEvaluator() {
      return true;
    }
  });

  assert.equal(result.state, "baseline-execution-failed");
  assert.equal(result.baselinePositiveControlPassed, null);
  assert.deepEqual(result.failureReasons, ["baseline-execution-failed"]);
});

test("improved positive-control false resolves without an after replay", async () => {
  const protection = await confirmedProtection();
  const result = await verifyContractProtection({
    protection,
    evaluator: historicalEvaluator,
    improvedEvaluator() {
      return false;
    }
  });

  assert.equal(result.state, "improved-positive-control-failed");
  assert.equal(result.baselinePositiveControlPassed, true);
  assert.equal(result.improvedPositiveControlPassed, false);
  assert.notEqual(result.baseline, null);
  assert.equal(result.after, null);
  assert.deepEqual(result.eliminatedAttackIds, []);
  assert.deepEqual(result.regressionAttackIds, []);
});

test("complete replay reports regression precedence even when source is caught", async () => {
  const protection = await confirmedProtection();
  const result = await verifyContractProtection({
    protection,
    evaluator: historicalEvaluator,
    improvedEvaluator(output) {
      if (output.time === "4 PM") {
        return false;
      }
      return true;
    }
  });

  assert.equal(result.state, "regression-detected");
  assert.equal(result.verificationPassed, false);
  assert.equal(result.sourceFindingCaught, true);
  assert.deepEqual(result.eliminatedAttackIds, ["attack-a"]);
  assert.deepEqual(result.regressionAttackIds, ["attack-b"]);
  assert.deepEqual(result.failureReasons, ["regression-detected"]);
});

test("complete replay reports source-finding-still-survives", async () => {
  const protection = await confirmedProtection();
  const result = await verifyContractProtection({
    protection,
    evaluator: historicalEvaluator,
    improvedEvaluator: historicalEvaluator
  });

  assert.equal(result.state, "source-finding-still-survives");
  assert.equal(result.verificationPassed, false);
  assert.equal(result.sourceFindingCaught, false);
  assert.deepEqual(result.regressionAttackIds, []);
  assert.deepEqual(result.failureReasons, ["source-finding-still-survives"]);
});

test("verification captures confirmed protection synchronously", async () => {
  const protection = await confirmedProtection();
  const originalStatement = protection.protection.statement;
  const promise = verifyContractProtection({
    protection,
    evaluator: historicalEvaluator,
    improvedEvaluator(output) {
      return output.time === "3 PM";
    }
  });

  protection.protection.statement = "mutated after invocation";
  const result = await promise;
  assert.equal(result.protection.statement, originalStatement);
});

test("verification rejects non-confirmed artifacts before callbacks", async () => {
  const protection = await confirmedProtection();
  protection.status = "draft";
  let calls = 0;
  await assert.rejects(
    verifyContractProtection({
      protection,
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


test("verification ignores inherited Object.prototype thenables across internal replay boundaries", async () => {
  const protection = await confirmedProtection();
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
    const result = await verifyContractProtection({
      protection,
      evaluator: historicalEvaluator,
      improvedEvaluator(output) {
        return output.time === "3 PM";
      }
    });

    assertCanonicalResult(result);
    assert.equal(result.state, "verified");
    assert.equal(result.verificationPassed, true);
    assert.equal(thenCalls, 0);
  } finally {
    delete Object.prototype.then;
  }
});


test("verification shields internal Promise observations from hostile species and constructor hooks", async () => {
  const protection = await confirmedProtection();
  const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
  const constructorDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, "constructor");
  let remediationSpeciesCalls = 0;
  let remediationConstructorCalls = 0;

  Object.defineProperty(Promise, Symbol.species, {
    get() {
      if (String(new Error().stack).includes("contract-remediation.js")) {
        remediationSpeciesCalls += 1;
      }
      return Promise;
    },
    configurable: true
  });
  Object.defineProperty(Promise.prototype, "constructor", {
    get() {
      if (String(new Error().stack).includes("contract-remediation.js")) {
        remediationConstructorCalls += 1;
      }
      return Promise;
    },
    configurable: true
  });

  try {
    await assert.rejects(
      verifyContractProtection({
        protection,
        evaluator: historicalEvaluator,
        improvedEvaluator(output) {
          return output.time === "3 PM";
        }
      }),
      TypeError
    );
    assert.equal(remediationSpeciesCalls, 0);
    assert.equal(remediationConstructorCalls, 0);
  } finally {
    Object.defineProperty(Promise, Symbol.species, speciesDescriptor);
    Object.defineProperty(Promise.prototype, "constructor", constructorDescriptor);
  }
});
