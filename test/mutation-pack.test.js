const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compileMutationPack
} = require("../src/mutation-pack");

const {
  runImprovementLoop
} = require("../src/engine");

function makeValidMutation(
  overrides = {}
) {
  return {
    id: "wrong-value",
    type: "value-substitution",
    description:
      "Changes the expected value.",

    mutate(output) {
      return `${output}-mutated`;
    },

    scores: {
      severity: 1,
      realism: 0.9,
      subtlety: 0.8,
      novelty: 0.7,
      fixability: 0.6
    },

    protection: {
      description:
        "The value must remain correct.",

      check(output) {
        return output === "good";
      }
    },

    ...overrides
  };
}

test(
  "valid pack compiles to engine format",
  () => {
    const protectionCheck =
      (output) => output === "good";

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            protection: {
              description:
                "The value must remain correct.",
              check: protectionCheck
            }
          })
        ]
      });

    assert.equal(compiled.length, 1);

    assert.deepEqual(
      {
        id: compiled[0].id,
        type: compiled[0].type,
        output: compiled[0].output,
        severity: compiled[0].severity,
        realism: compiled[0].realism,
        subtlety: compiled[0].subtlety,
        novelty: compiled[0].novelty,
        fixability: compiled[0].fixability,
        protection:
          compiled[0].protection
      },
      {
        id: "wrong-value",
        type: "value-substitution",
        output: "original-mutated",
        severity: 1,
        realism: 0.9,
        subtlety: 0.8,
        novelty: 0.7,
        fixability: 0.6,
        protection:
          "The value must remain correct."
      }
    );

    assert.equal(
      compiled[0].protectionCheck,
      protectionCheck
    );
  }
);

test(
  "duplicate mutation IDs are rejected",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "original",
          pack: [
            makeValidMutation(),
            makeValidMutation()
          ]
        });
      },
      /Duplicate mutation id: wrong-value/
    );
  }
);

test(
  "invalid scores are rejected",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              scores: {
                severity: 1.2,
                realism: 0.9,
                subtlety: 0.8,
                novelty: 0.7,
                fixability: 0.6
              }
            })
          ]
        });
      },
      /severity must be a number between 0 and 1/
    );
  }
);

test(
  "async mutations are rejected",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              async mutate(output) {
                return `${output}-mutated`;
              }
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );
  }
);

test(
  "malformed protections are rejected",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              protection: {
                description:
                  "Missing check function"
              }
            })
          ]
        });
      },
      /protection check must be a function/
    );
  }
);

test(
  "empty mutation pack compiles safely",
  () => {
    const compiled =
      compileMutationPack({
        output: "original",
        pack: []
      });

    assert.deepEqual(compiled, []);
  }
);

test(
  "compiled pack works with improvement loop",
  () => {
    const knownGoodOutput =
      "Status: approved\nAmount: 100";

    function extractField(
      output,
      field
    ) {
      const match = output.match(
        new RegExp(
          `^${field}:\\s*(.+)$`,
          "im"
        )
      );

      return match
        ? match[1].trim()
        : null;
    }

    const pack = [
      {
        id: "wrong-amount",
        type: "value-substitution",
        description:
          "Changes the approved amount.",

        mutate() {
          return (
            "Status: approved\n" +
            "Amount: 999"
          );
        },

        scores: {
          severity: 1,
          realism: 1,
          subtlety: 1,
          novelty: 1,
          fixability: 1
        },

        protection: {
          description:
            "Approved amount must remain 100.",

          check(output) {
            return (
              extractField(
                output,
                "Amount"
              ) === "100"
            );
          }
        }
      },

      {
        id: "wrong-status",
        type: "entity-substitution",
        description:
          "Changes the approval status.",

        mutate() {
          return (
            "Status: rejected\n" +
            "Amount: 100"
          );
        },

        scores: {
          severity: 0.8,
          realism: 0.8,
          subtlety: 0.8,
          novelty: 0.8,
          fixability: 0.8
        },

        protection: {
          description:
            "Status must remain approved.",

          check(output) {
            return (
              extractField(
                output,
                "Status"
              ) === "approved"
            );
          }
        }
      }
    ];

    function weakEvaluator(output) {
      return (
        extractField(
          output,
          "Status"
        ) === "approved"
      );
    }

    const mutations =
      compileMutationPack({
        output: knownGoodOutput,
        pack
      });

    const result =
      runImprovementLoop({
        evaluator: weakEvaluator,
        mutations,
        knownGoodOutput
      });

    assert.equal(
      result.before.caught.length,
      1
    );

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
      result.after.caught.length,
      2
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
