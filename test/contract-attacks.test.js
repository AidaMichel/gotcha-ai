"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  runContractAttacks
} = require(
  "../src/contract-attacks"
);

function makeContract(
  rules = [
    {
      id: "time-rule",
      statement:
        "Time must be 3 PM.",
      kind: "required",
      severity: "major"
    }
  ]
) {
  return {
    version: 1,
    status: "confirmed",
    task:
      "Return the approved time.",
    rules
  };
}

function makeScores() {
  return {
    realism: 0.9,
    subtlety: 0.8,
    novelty: 0.7,
    fixability: 0.9
  };
}

function makeAttack(
  overrides = {}
) {
  return {
    id: "wrong-time",
    ruleId: "time-rule",
    type: "wrong-time",
    description:
      "Changes the approved time.",
    rationale:
      "Violates the confirmed rule.",
    mutatedOutput: {
      time: "4 PM"
    },
    scores: makeScores(),
    ...overrides
  };
}

function baseOptions(
  overrides = {}
) {
  const contract =
    makeContract();

  return {
    contract,

    input: {
      request:
        "Schedule the meeting."
    },

    expectedOutput: {
      time: "3 PM"
    },

    evaluator(output) {
      return (
        output.time ===
          "3 PM"
      );
    },

    generator() {
      return {
        version: 1,
        task: contract.task,
        attacks: []
      };
    },

    ...overrides
  };
}

test(
  "runContractAttacks runs a generated attack through the deterministic engine",
  async () => {
    const contract =
      makeContract();

    const result =
      await runContractAttacks({
        ...baseOptions({
          contract
        }),

        generator() {
          return {
            version: 1,
            task: contract.task,
            attacks: [
              makeAttack()
            ]
          };
        }
      });

    assert.equal(
      result.baselinePassed,
      true
    );

    assert.equal(
      result.generatedAttacks
        .length,
      1
    );

    assert.equal(
      result.attack.results
        .length,
      1
    );

    assert.equal(
      result.attack.caught
        .length,
      1
    );

    assert.equal(
      result.attack.survivors
        .length,
      0
    );

    assert.equal(
      result.topFinding,
      null
    );
  }
);

test(
  "positive control must pass before generator runs",
  async () => {
    let generatorCalls = 0;

    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            evaluator() {
              return false;
            },

            generator() {
              generatorCalls += 1;

              return {
                version: 1,
                task:
                  "Return the approved time.",
                attacks: []
              };
            }
          })
        ),
      /must pass expectedOutput/
    );

    assert.equal(
      generatorCalls,
      0
    );
  }
);

test(
  "generator receives isolated copies of trusted inputs",
  async () => {
    const contract =
      makeContract();

    const input = {
      nested: {
        value: "original"
      }
    };

    const expectedOutput = {
      time: "3 PM"
    };

    let contractIsOriginal;
    let inputIsOriginal;
    let expectedIsOriginal;

    await runContractAttacks({
      contract,
      input,
      expectedOutput,

      evaluator(output) {
        return (
          output.time ===
            "3 PM"
        );
      },

      generator(args) {
        contractIsOriginal =
          args.contract ===
            contract;

        inputIsOriginal =
          args.input === input;

        expectedIsOriginal =
          args.expectedOutput ===
            expectedOutput;

        args.contract.task =
          "mutated";

        args.input.nested.value =
          "mutated";

        args.expectedOutput.time =
          "mutated";

        return {
          version: 1,
          task:
            "Return the approved time.",
          attacks: []
        };
      }
    });

    assert.equal(
      contractIsOriginal,
      false
    );

    assert.equal(
      inputIsOriginal,
      false
    );

    assert.equal(
      expectedIsOriginal,
      false
    );

    assert.equal(
      contract.task,
      "Return the approved time."
    );

    assert.equal(
      input.nested.value,
      "original"
    );

    assert.equal(
      expectedOutput.time,
      "3 PM"
    );
  }
);

test(
  "identical generated outputs are deduplicated across rule IDs",
  async () => {
    const contract =
      makeContract([
        {
          id: "rule-a",
          statement:
            "Time must be 3 PM.",
          kind: "required",
          severity: "major"
        },
        {
          id: "rule-b",
          statement:
            "Do not change the approved time.",
          kind: "forbidden",
          severity: "major"
        }
      ]);

    const result =
      await runContractAttacks({
        ...baseOptions({
          contract
        }),

        generator() {
          return {
            version: 1,
            task: contract.task,
            attacks: [
              makeAttack({
                id: "attack-a",
                ruleId: "rule-a"
              }),

              makeAttack({
                id: "attack-b",
                ruleId: "rule-b"
              })
            ]
          };
        }
      });

    assert.equal(
      result.generatedAttacks
        .length,
      1
    );

    assert.deepEqual(
      result.discardedAttacks,
      [
        {
          id: "attack-b",
          ruleId: "rule-b",
          reason:
            "duplicate-attack",
          duplicateOf:
            "attack-a"
        }
      ]
    );
  }
);

test(
  "unchanged generated outputs are discarded",
  async () => {
    const contract =
      makeContract();

    const result =
      await runContractAttacks({
        ...baseOptions({
          contract
        }),

        generator() {
          return {
            version: 1,
            task: contract.task,
            attacks: [
              makeAttack({
                mutatedOutput: {
                  time: "3 PM"
                }
              })
            ]
          };
        }
      });

    assert.equal(
      result.generatedAttacks
        .length,
      0
    );

    assert.equal(
      result.discardedAttacks[0]
        .reason,
      "unchanged-output"
    );
  }
);

test(
  "generator then accessor is rejected without invoking getter",
  async () => {
    let getterCalls = 0;

    const output = {
      version: 1,
      task:
        "Return the approved time.",
      attacks: []
    };

    Object.defineProperty(
      output,
      "then",
      {
        enumerable: true,

        get() {
          getterCalls += 1;
          return undefined;
        }
      }
    );

    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            generator() {
              return output;
            }
          })
        ),
      /accessor/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "generator custom then function is rejected without invocation",
  async () => {
    let thenCalls = 0;

    const output = {
      then() {
        thenCalls += 1;
      }
    };

    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            generator() {
              return output;
            }
          })
        ),
      /functions/
    );

    assert.equal(
      thenCalls,
      0
    );
  }
);

test(
  "evaluator object result is rejected without reading then accessor",
  async () => {
    let getterCalls = 0;

    function evaluator() {
      const result = {};

      Object.defineProperty(
        result,
        "then",
        {
          enumerable: true,

          get() {
            getterCalls += 1;
            return undefined;
          }
        }
      );

      return result;
    }

    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            evaluator
          })
        ),
      /must return a boolean/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "evaluator Proxy result is rejected without invoking traps",
  async () => {
    let trapCalls = 0;

    function evaluator() {
      return new Proxy(
        {},
        {
          get() {
            trapCalls += 1;
            return undefined;
          }
        }
      );
    }

    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            evaluator
          })
        ),
      /must return a boolean/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "async evaluators remain unsupported",
  async () => {
    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            async evaluator() {
              return true;
            }
          })
        ),
      /Async checks are not supported/
    );
  }
);

test(
  "normal async generator is supported",
  async () => {
    const result =
      await runContractAttacks(
        baseOptions({
          async generator() {
            return {
              version: 1,
              task:
                "Return the approved time.",
              attacks: []
            };
          }
        })
      );

    assert.equal(
      result.baselinePassed,
      true
    );

    assert.equal(
      result.generatedAttacks
        .length,
      0
    );
  }
);

test(
  "native generator Promise constructor accessor is rejected without invocation",
  async () => {
    let getterCalls = 0;

    const promise =
      Promise.resolve({
        version: 1,
        task:
          "Return the approved time.",
        attacks: []
      });

    Object.defineProperty(
      promise,
      "constructor",
      {
        configurable: true,

        get() {
          getterCalls += 1;
          return Promise;
        }
      }
    );

    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            generator() {
              return promise;
            }
          })
        ),
      /must not shadow constructor/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "native generator Promise then accessor is rejected without invocation",
  async () => {
    let getterCalls = 0;

    const promise =
      Promise.resolve({
        version: 1,
        task:
          "Return the approved time.",
        attacks: []
      });

    Object.defineProperty(
      promise,
      "then",
      {
        configurable: true,

        get() {
          getterCalls += 1;
          return Promise.prototype.then;
        }
      }
    );

    await assert.rejects(
      () =>
        runContractAttacks(
          baseOptions({
            generator() {
              return promise;
            }
          })
        ),
      /must not shadow then/
    );

    assert.equal(
      getterCalls,
      0
    );
  }
);

test(
  "compiled generated rule and output remain frozen",
  async () => {
    const contract =
      makeContract();

    const result =
      await runContractAttacks({
        ...baseOptions({
          contract
        }),

        evaluator() {
          return true;
        },

        generator() {
          return {
            version: 1,
            task: contract.task,
            attacks: [
              makeAttack()
            ]
          };
        }
      });

    const generated =
      result.generatedAttacks[0];

    assert.equal(
      Object.isFrozen(
        generated.rule
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        generated.output
      ),
      true
    );
  }
);
