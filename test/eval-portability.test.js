const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runGotcha
} = require("../src");

function makeMutationPack({
  expectedQuantity,
  expectedWarehouse
}) {
  return [
    {
      id: "wrong-quantity",
      type: "value-substitution",
      description:
        "Changes the approved quantity.",

      mutate(output) {
        output.quantity =
          expectedQuantity + 10;

        return output;
      },

      scores: {
        severity: 1,
        realism: 0.95,
        subtlety: 0.9,
        novelty: 0.8,
        fixability: 1
      },

      protection: {
        description:
          "Quantity must match the approved quantity.",

        check(output) {
          return (
            output.quantity ===
            expectedQuantity
          );
        }
      }
    },

    {
      id: "wrong-warehouse",
      type: "entity-substitution",
      description:
        "Changes the approved warehouse.",

      mutate(output) {
        output.warehouse =
          "WRONG-WAREHOUSE";

        return output;
      },

      scores: {
        severity: 0.9,
        realism: 0.9,
        subtlety: 0.85,
        novelty: 0.75,
        fixability: 0.95
      },

      protection: {
        description:
          "Warehouse must match the approved warehouse.",

        check(output) {
          return (
            output.warehouse ===
            expectedWarehouse
          );
        }
      }
    }
  ];
}

test(
  "same public API adapts to different evaluator logic",
  () => {
    const expectedOutput = {
      orderId: "ORD-1042",
      decision: "ship",
      quantity: 2,
      warehouse: "DXB-1"
    };

    const mutationPack =
      makeMutationPack({
        expectedQuantity: 2,
        expectedWarehouse: "DXB-1"
      });

    function weakEvaluator(output) {
      return (
        output.orderId === "ORD-1042" &&
        output.decision === "ship"
      );
    }

    function quantityAwareEvaluator(
      output
    ) {
      return (
        output.orderId === "ORD-1042" &&
        output.decision === "ship" &&
        output.quantity === 2
      );
    }

    const weakResult =
      runGotcha({
        evaluator: weakEvaluator,
        expectedOutput,
        mutationPack
      });

    const strongerResult =
      runGotcha({
        evaluator:
          quantityAwareEvaluator,
        expectedOutput,
        mutationPack
      });

    assert.deepEqual(
      weakResult.before.survivors.map(
        (finding) => finding.id
      ),
      [
        "wrong-quantity",
        "wrong-warehouse"
      ]
    );

    assert.equal(
      weakResult.topFinding.id,
      "wrong-quantity"
    );

    assert.deepEqual(
      strongerResult.before.survivors.map(
        (finding) => finding.id
      ),
      [
        "wrong-warehouse"
      ]
    );

    assert.equal(
      strongerResult.topFinding.id,
      "wrong-warehouse"
    );
  }
);

test(
  "an external eval harness can run different eval cases through runGotcha",
  () => {
    const evalSet = [
      {
        expectedOutput: {
          orderId: "ORD-1042",
          decision: "ship",
          quantity: 2,
          warehouse: "DXB-1"
        },

        evaluator(output) {
          return (
            output.orderId ===
              "ORD-1042" &&
            output.decision === "ship"
          );
        }
      },

      {
        expectedOutput: {
          orderId: "ORD-2008",
          decision: "ship",
          quantity: 5,
          warehouse: "AUH-2"
        },

        evaluator(output) {
          return (
            output.orderId ===
              "ORD-2008" &&
            output.decision === "ship" &&
            output.quantity === 5
          );
        }
      }
    ];

    const results =
      evalSet.map((evalCase) =>
        runGotcha({
          evaluator:
            evalCase.evaluator,

          expectedOutput:
            evalCase.expectedOutput,

          mutationPack:
            makeMutationPack({
              expectedQuantity:
                evalCase
                  .expectedOutput
                  .quantity,

              expectedWarehouse:
                evalCase
                  .expectedOutput
                  .warehouse
            })
        })
      );

    assert.equal(
      results.length,
      2
    );

    assert.equal(
      results[0].topFinding.id,
      "wrong-quantity"
    );

    assert.equal(
      results[1].topFinding.id,
      "wrong-warehouse"
    );
  }
);
