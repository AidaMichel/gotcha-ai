const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runGotcha
} = require("../src");

test(
  "public API runs the complete Gotcha improvement loop",
  () => {
    const expectedOutput = {
      status: "approved",
      amount: 100
    };

    function evaluator(output) {
      return (
        output.status === "approved"
      );
    }

    const mutationPack = [
      {
        id: "wrong-amount",
        type: "value-substitution",
        description:
          "Changes the amount while preserving the approved status.",

        mutate(output) {
          output.amount = 999;
          return output;
        },

        scores: {
          severity: 1,
          realism: 0.9,
          subtlety: 0.9,
          novelty: 0.7,
          fixability: 1
        },

        protection: {
          description:
            "Approved output must preserve the expected amount.",

          check(output) {
            return output.amount === 100;
          }
        }
      }
    ];

    const result =
      runGotcha({
        evaluator,
        expectedOutput,
        mutationPack
      });

    assert.equal(
      result.before.survivors.length,
      1
    );

    assert.equal(
      result.topFinding.id,
      "wrong-amount"
    );

    assert.equal(
      result.positiveControlPassed,
      true
    );

    assert.equal(
      result.after.survivors.length,
      0
    );

    assert.equal(
      result.improvement,
      1
    );
  }
);
