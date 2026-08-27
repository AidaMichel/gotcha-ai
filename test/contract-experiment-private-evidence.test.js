"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks
} = require("../src/contract-attacks");

function makeContract() {
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

test(
  "Promise-returning generator captures settled output",
  async () => {
    const contract = makeContract();

    const result = await runContractAttacks({
      contract,
      input: {
        request: "Schedule the meeting."
      },
      expectedOutput: {
        time: "3 PM"
      },
      evaluator(output) {
        return output.time === "3 PM";
      },
      generator() {
        return Promise.resolve({
          version: 1,
          task: contract.task,
          attacks: []
        });
      }
    });

    assert.equal(
      result.experiment.replayable,
      true
    );
  }
);

test(
  "safe experiment module exposes no active-context evidence setter",
  () => {
    const safe = require(
      "../src/contract-experiment-safe"
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        safe,
        "captureGeneratorOutputForActiveExperiment"
      ),
      false
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        safe,
        "withExperimentCapture"
      ),
      false
    );
  }
);
