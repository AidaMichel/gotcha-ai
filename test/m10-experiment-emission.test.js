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

function makeOptions(
  overrides = {}
) {
  const contract = makeContract();

  return {
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
              time: "4 PM"
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
    },
    ...overrides
  };
}

test(
  "successful M8 results append one replayable Revision 20 experiment",
  async () => {
    const result =
      await runContractAttacks(
        makeOptions()
      );

    assert.deepEqual(
      Reflect.ownKeys(result),
      [
        "version",
        "task",
        "baselinePassed",
        "generatedAttacks",
        "discardedAttacks",
        "attack",
        "topFinding",
        "experiment"
      ]
    );

    assert.deepEqual(
      Object.getOwnPropertyDescriptor(
        result,
        "experiment"
      ),
      {
        value: result.experiment,
        writable: true,
        enumerable: true,
        configurable: true
      }
    );

    assert.equal(
      result.experiment.replayable,
      true
    );
    assert.equal(
      result.experiment.task,
      result.task
    );
    assert.equal(
      result.experiment.contract.task,
      result.task
    );
    assert.deepEqual(
      result.experiment.baseline.outcomes,
      [
        {
          attackId: "wrong-time",
          evaluatorResult: "FAIL",
          survived: false
        }
      ]
    );
    assert.deepEqual(
      result.experiment.baseline.survivorOrderIds,
      []
    );
    assert.equal(
      result.experiment.baseline.topFindingId,
      null
    );

    assert.notEqual(
      result.experiment.attacks,
      result.generatedAttacks
    );
    assert.notEqual(
      result.experiment.attacks[0],
      result.generatedAttacks[0]
    );
    assert.notEqual(
      result.experiment.attacks[0].output,
      result.generatedAttacks[0].output
    );

    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          result.experiment
        )
      ),
      result.experiment
    );
  }
);

test(
  "experiment case authority is captured before callbacks can mutate caller data",
  async () => {
    const options = makeOptions();
    let release;

    options.generator = () =>
      new Promise((resolve) => {
        release = () => resolve({
          version: 1,
          task: options.contract.task,
          attacks: []
        });
      });

    const pending =
      runContractAttacks(options);

    options.input.request = "mutated";
    options.expectedOutput.time = "mutated";

    release();

    const result = await pending;

    assert.equal(
      result.experiment.replayable,
      true
    );
    assert.equal(
      result.experiment.case.input.request,
      "Schedule the meeting."
    );
    assert.equal(
      result.experiment.case.expectedOutput.time,
      "3 PM"
    );
  }
);

test(
  "successful M8 runs emit the exact non-replayable variant for unsupported wire cases",
  async () => {
    const expectedOutput =
      Object.create(null);
    expectedOutput.time = "3 PM";

    const result =
      await runContractAttacks(
        makeOptions({
          expectedOutput,
          evaluator(output) {
            return output.time === "3 PM";
          },
          generator() {
            return {
              version: 1,
              task: "Return the approved time.",
              attacks: []
            };
          }
        })
      );

    assert.deepEqual(
      result.experiment,
      {
        version: 1,
        kind: "contract-attack-experiment",
        replayable: false,
        task: "Return the approved time.",
        reason: {
          code: "EXPERIMENT_NOT_WIRE_REPLAYABLE"
        }
      }
    );
  }
);
