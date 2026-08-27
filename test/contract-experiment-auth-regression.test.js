"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks
} = require("../src/contract-attacks");
const {
  snapshotAiData
} = require("../src/ai-data");

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
  "synchronous matching-label snapshots cannot preempt genuine generator evidence",
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
        const fake = {
          version: 1,
          task: contract.task
        };

        Object.defineProperty(
          fake,
          "attacks",
          {
            get() {
              throw new Error(
                "spoofed generator evidence must be ignored"
              );
            },
            configurable: true
          }
        );

        try {
          snapshotAiData(
            fake,
            "Generator output"
          );
        } catch {
          // The spoof may reject independently; it must not consume capture authority.
        }

        return {
          version: 1,
          task: contract.task,
          attacks: []
        };
      }
    });

    assert.equal(
      result.experiment.replayable,
      true
    );
  }
);
