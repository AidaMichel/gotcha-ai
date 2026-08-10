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
      compiled[0].protectionCheck(
        "good"
      ),
      true
    );

    assert.equal(
      compiled[0].protectionCheck(
        "bad"
      ),
      false
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

test(
  "rejected native async mutations are rejected before invocation",
  () => {
    let invoked = false;

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              async mutate() {
                invoked = true;

                throw new Error(
                  "should never execute"
                );
              }
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );

    assert.equal(invoked, false);
  }
);

test(
  "promise-returning mutations are rejected safely",
  async () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate() {
                return Promise.reject(
                  new Error(
                    "rejected mutation"
                  )
                );
              }
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );

    // Give Node one turn to surface an
    // unhandled rejection if one escaped.
    await new Promise(
      (resolve) => setImmediate(resolve)
    );
  }
);

test(
  "native async protection checks are rejected before mutations run",
  () => {
    let mutateCalls = 0;

    const first =
      makeValidMutation({
        id: "first",

        mutate(output) {
          mutateCalls += 1;
          return `${output}-first`;
        }
      });

    const second =
      makeValidMutation({
        id: "second",

        protection: {
          description:
            "Async protection.",

          async check() {
            return true;
          }
        }
      });

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",
          pack: [
            first,
            second
          ]
        });
      },
      /Async protection checks are not supported/
    );

    assert.equal(
      mutateCalls,
      0
    );
  }
);

test(
  "promise-returning protection checks are rejected safely",
  async () => {
    const mutations =
      compileMutationPack({
        output: "good",

        pack: [
          makeValidMutation({
            mutate() {
              return "bad";
            },

            protection: {
              description:
                "Rejecting protection.",

              check() {
                return Promise.reject(
                  new Error(
                    "rejected protection"
                  )
                );
              }
            }
          })
        ]
      });

    assert.throws(
      () => {
        runImprovementLoop({
          evaluator() {
            return true;
          },

          mutations,
          knownGoodOutput: "good"
        });
      },
      /Async protection checks are not supported/
    );

    // Give Node one turn to expose an
    // unhandled rejection if one escaped.
    await new Promise(
      (resolve) =>
        setImmediate(resolve)
    );
  }
);

test(
  "entire pack validates before mutations execute",
  () => {
    let mutateCalls = 0;

    const valid =
      makeValidMutation({
        id: "valid",

        mutate(output) {
          mutateCalls += 1;
          return `${output}-mutated`;
        }
      });

    const malformed =
      makeValidMutation({
        id: "malformed",
        type: ""
      });

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",
          pack: [
            valid,
            malformed
          ]
        });
      },
      /type must be a non-empty string/
    );

    assert.equal(
      mutateCalls,
      0
    );
  }
);

test(
  "sparse mutation packs are rejected",
  () => {
    const sparsePack =
      new Array(2);

    sparsePack[1] =
      makeValidMutation({
        id: "second"
      });

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",
          pack: sparsePack
        });
      },
      /Mutation at index 0 must be present/
    );
  }
);

test(
  "validated pack is snapshotted before mutations execute",
  () => {
    const pack = [];

    pack.push(
      makeValidMutation({
        id: "first",

        mutate(output) {
          // Mutate the original pack after
          // validation has completed.
          pack.pop();

          return `${output}-first`;
        }
      }),

      makeValidMutation({
        id: "second",

        mutate(output) {
          return `${output}-second`;
        }
      })
    );

    const compiled =
      compileMutationPack({
        output: "original",
        pack
      });

    assert.equal(
      compiled.length,
      2
    );

    assert.deepEqual(
      compiled.map(
        (mutation) => mutation.id
      ),
      [
        "first",
        "second"
      ]
    );

    assert.deepEqual(
      compiled.map(
        (mutation) => mutation.output
      ),
      [
        "original-first",
        "original-second"
      ]
    );
  }
);

test(
  "each mutation receives an isolated mutable output",
  () => {
    const baseline = {
      value: 0
    };

    const compiled =
      compileMutationPack({
        output: baseline,

        pack: [
          makeValidMutation({
            id: "set-one",

            mutate(output) {
              output.value = 1;
              return output;
            }
          }),

          makeValidMutation({
            id: "set-two",

            mutate(output) {
              output.value = 2;
              return output;
            }
          })
        ]
      });

    assert.deepEqual(
      baseline,
      {
        value: 0
      }
    );

    assert.deepEqual(
      compiled[0].output,
      {
        value: 1
      }
    );

    assert.deepEqual(
      compiled[1].output,
      {
        value: 2
      }
    );

    assert.notEqual(
      compiled[0].output,
      compiled[1].output
    );

    assert.notEqual(
      compiled[0].output,
      baseline
    );
  }
);

test(
  "shared mutable mutation results are isolated",
  () => {
    const shared = {
      value: 0
    };

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            id: "shared-one",

            mutate() {
              shared.value = 1;
              return shared;
            }
          }),

          makeValidMutation({
            id: "shared-two",

            mutate() {
              shared.value = 2;
              return shared;
            }
          })
        ]
      });

    assert.deepEqual(
      compiled[0].output,
      {
        value: 1
      }
    );

    assert.deepEqual(
      compiled[1].output,
      {
        value: 2
      }
    );

    assert.notEqual(
      compiled[0].output,
      shared
    );

    assert.notEqual(
      compiled[0].output,
      compiled[1].output
    );
  }
);

test(
  "async-generator mutations are rejected",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              async *mutate() {
                yield "mutated";
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
  "score values are captured exactly once",
  () => {
    let severityReads = 0;

    const scores = {
      realism: 0.9,
      subtlety: 0.8,
      novelty: 0.7,
      fixability: 0.6
    };

    Object.defineProperty(
      scores,
      "severity",
      {
        enumerable: true,

        get() {
          severityReads += 1;

          return severityReads === 1
            ? 0.75
            : Number.NaN;
        }
      }
    );

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            scores
          })
        ]
      });

    assert.equal(
      severityReads,
      1
    );

    assert.equal(
      compiled[0].severity,
      0.75
    );
  }
);
