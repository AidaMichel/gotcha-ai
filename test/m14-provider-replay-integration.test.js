"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createStructuredProviderAdapter,
  runContractAttacks
} = require("../src");

function response(output) {
  return {
    version: 1,
    kind: "gotcha-provider-response",
    output
  };
}

test(
  "M11 contract-attacks adapter output remains replayable for M13/M14",
  async () => {
    const contract = {
      version: 1,
      status: "confirmed",
      task: "Return the approved meeting time.",
      rules: [
        {
          id: "time-rule",
          statement: "The meeting time must be 3 PM.",
          kind: "required",
          severity: "major"
        }
      ]
    };

    const generator = createStructuredProviderAdapter({
      model: "fake-model",
      mode: "contract-attacks",
      transport() {
        return response({
          version: 1,
          task: contract.task,
          attacks: [
            {
              id: "wrong-time",
              ruleId: "time-rule",
              type: "wrong-time",
              description: "Changes the approved time.",
              rationale: "The evaluator accepts the changed time.",
              mutatedOutput: {
                time: "4 PM",
                nested: {
                  source: "provider"
                }
              },
              scores: {
                realism: 0.9,
                subtlety: 0.8,
                novelty: 0.7,
                fixability: 0.9
              }
            }
          ]
        });
      }
    });

    const result = await runContractAttacks({
      contract,
      input: { request: "Schedule at 3 PM." },
      expectedOutput: { time: "3 PM" },
      evaluator() {
        return true;
      },
      generator
    });

    assert.equal(result.experiment.replayable, true);
    assert.deepEqual(
      result.experiment.baseline.survivorOrderIds,
      ["wrong-time"]
    );
    assert.equal(
      Object.getPrototypeOf(result.experiment.attacks[0].output),
      Object.prototype
    );
    assert.equal(
      Object.getPrototypeOf(result.experiment.attacks[0].output.nested),
      Object.prototype
    );
  }
);
