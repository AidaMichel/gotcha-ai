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
  "score accessor metadata is rejected without invocation",
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

          return 0.75;
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              scores
            })
          ]
        });
      },
      /scores must use data properties only/
    );

    assert.equal(
      severityReads,
      0
    );
  }
);

test(
  "custom class outputs are rejected before mutation execution",
  () => {
    class CustomOutput {
      constructor() {
        this.value = 1;
      }

      read() {
        return this.value;
      }
    }

    let invoked = false;

    assert.throws(
      () => {
        compileMutationPack({
          output:
            new CustomOutput(),

          pack: [
            makeValidMutation({
              mutate(output) {
                invoked = true;
                return output;
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      invoked,
      false
    );
  }
);

test(
  "Buffer mutation values are rejected",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output:
            Buffer.from("hello"),

          pack: [
            makeValidMutation()
          ]
        });
      },
      /Buffer values/
    );
  }
);

test(
  "SharedArrayBuffer mutation values are rejected",
  () => {
    if (
      typeof SharedArrayBuffer ===
      "undefined"
    ) {
      return;
    }

    assert.throws(
      () => {
        compileMutationPack({
          output:
            new SharedArrayBuffer(8),

          pack: [
            makeValidMutation()
          ]
        });
      },
      /SharedArrayBuffer/
    );
  }
);

test(
  "source output is snapshotted once before mutations execute",
  () => {
    const baseline = {
      value: 0
    };

    const observed = [];

    const compiled =
      compileMutationPack({
        output: baseline,

        pack: [
          makeValidMutation({
            id: "first",

            mutate(output) {
              observed.push(
                output.value
              );

              baseline.value = 99;

              return output;
            }
          }),

          makeValidMutation({
            id: "second",

            mutate(output) {
              observed.push(
                output.value
              );

              return output;
            }
          })
        ]
      });

    assert.deepEqual(
      observed,
      [
        0,
        0
      ]
    );

    assert.deepEqual(
      compiled[0].output,
      {
        value: 0
      }
    );

    assert.deepEqual(
      compiled[1].output,
      {
        value: 0
      }
    );

    assert.equal(
      baseline.value,
      99
    );
  }
);

test(
  "accessor-based mutation values are rejected without invoking getters",
  () => {
    let getterReads = 0;

    const baseline = {};

    Object.defineProperty(
      baseline,
      "value",
      {
        enumerable: true,
        configurable: true,

        get() {
          getterReads += 1;
          return getterReads;
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: baseline,

          pack: [
            makeValidMutation()
          ]
        });
      },
      /accessor properties/
    );

    assert.equal(
      getterReads,
      0
    );
  }
);

test(
  "compiled mutable outputs cannot be changed by evaluators between attacks",
  () => {
    const mutations =
      compileMutationPack({
        output: {
          seen: false
        },

        pack: [
          makeValidMutation({
            id: "frozen-output",

            mutate(output) {
              return output;
            },

            protection: {
              description:
                "No-op protection.",

              check() {
                return true;
              }
            }
          })
        ]
      });

    function mutatingEvaluator(
      output
    ) {
      const passed =
        output.seen === false;

      Reflect.set(
        output,
        "seen",
        true
      );

      return passed;
    }

    const result =
      runImprovementLoop({
        evaluator:
          mutatingEvaluator,

        mutations,

        knownGoodOutput: {
          seen: false
        }
      });

    assert.equal(
      Object.isFrozen(
        mutations[0].output
      ),
      true
    );

    assert.equal(
      mutations[0].output.seen,
      false
    );

    assert.equal(
      result.before.survivors.length,
      1
    );

    assert.equal(
      result.after.survivors.length,
      1
    );

    assert.equal(
      result.improvement,
      0
    );
  }
);

test(
  "async callback detection ignores spoofed constructor properties",
  () => {
    let invoked = false;

    async function asyncMutation() {
      invoked = true;
      return "mutated";
    }

    Object.defineProperty(
      asyncMutation,
      "constructor",
      {
        value: Function,
        configurable: true
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate:
                asyncMutation
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );

    assert.equal(
      invoked,
      false
    );
  }
);

test(
  "synchronous callbacks remain valid with an own constructor property",
  () => {
    function syncMutation(output) {
      return `${output}-sync`;
    }

    Object.defineProperty(
      syncMutation,
      "constructor",
      {
        value: null,
        configurable: true
      }
    );

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            mutate:
              syncMutation
          })
        ]
      });

    assert.equal(
      compiled[0].output,
      "original-sync"
    );
  }
);

test(
  "ordinary cross-realm arrays are accepted",
  () => {
    const vm =
      require("node:vm");

    const crossRealmArray =
      vm.runInNewContext(
        "[1, { value: 2 }]"
      );

    const compiled =
      compileMutationPack({
        output:
          crossRealmArray,

        pack: [
          makeValidMutation({
            mutate(output) {
              return output;
            }
          })
        ]
      });

    assert.deepEqual(
      compiled[0].output,
      [
        1,
        {
          value: 2
        }
      ]
    );
  }
);

test(
  "ordinary cross-realm plain objects are accepted while array subclasses remain rejected",
  () => {
    const vm =
      require("node:vm");

    const crossRealmObject =
      vm.runInNewContext(
        "({ value: 2, nested: { ok: true } })"
      );

    const compiled =
      compileMutationPack({
        output:
          crossRealmObject,

        pack: [
          makeValidMutation({
            mutate(output) {
              return output;
            }
          })
        ]
      });

    assert.deepEqual(
      compiled[0].output,
      {
        value: 2,
        nested: {
          ok: true
        }
      }
    );

    class CustomArray
      extends Array {}

    assert.throws(
      () => {
        compileMutationPack({
          output:
            new CustomArray(
              1,
              2
            ),

          pack: [
            makeValidMutation()
          ]
        });
      },
      /array subclasses/
    );
  }
);

test(
  "bound async mutations are rejected before invocation",
  () => {
    let invoked = false;

    async function asyncMutation() {
      invoked = true;
      return "mutated";
    }

    const boundMutation =
      asyncMutation.bind(null);

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate:
                boundMutation
            })
          ]
        });
      },
      /Bound, proxied, or native mutation callbacks/
    );

    assert.equal(
      invoked,
      false
    );
  }
);

test(
  "bound async protection checks are rejected before mutations execute",
  () => {
    let mutationInvoked = false;

    async function asyncProtection() {
      return true;
    }

    const boundProtection =
      asyncProtection.bind(null);

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationInvoked = true;
                return output;
              },

              protection: {
                description:
                  "Bound protection.",

                check:
                  boundProtection
              }
            })
          ]
        });
      },
      /Bound, proxied, or native protection callbacks/
    );

    assert.equal(
      mutationInvoked,
      false
    );
  }
);

test(
  "SharedArrayBuffer is rejected even after prototype replacement",
  () => {
    if (
      typeof SharedArrayBuffer ===
      "undefined"
    ) {
      return;
    }

    const shared =
      new SharedArrayBuffer(8);

    Object.setPrototypeOf(
      shared,
      Object.prototype
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: shared,

          pack: [
            makeValidMutation()
          ]
        });
      },
      /SharedArrayBuffer/
    );
  }
);

test(
  "rejected native mutation promises with shadowed then are consumed safely",
  async () => {
    function mutation() {
      const rejected =
        Promise.reject(
          new Error("boom")
        );

      Object.defineProperty(
        rejected,
        "then",
        {
          value: null,
          configurable: true
        }
      );

      return rejected;
    }

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate: mutation
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );

    await new Promise(
      (resolve) =>
        setImmediate(resolve)
    );
  }
);

test(
  "rejected native protection promises with shadowed then are consumed safely",
  async () => {
    function protection() {
      const rejected =
        Promise.reject(
          new Error("boom")
        );

      Object.defineProperty(
        rejected,
        "then",
        {
          value: null,
          configurable: true
        }
      );

      return rejected;
    }

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            protection: {
              description:
                "Promise protection.",
              check: protection
            }
          })
        ]
      });

    assert.throws(
      () => {
        compiled[0]
          .protectionCheck(
            "candidate"
          );
      },
      /Async protection checks are not supported/
    );

    await new Promise(
      (resolve) =>
        setImmediate(resolve)
    );
  }
);

test(
  "branded mutable objects remain rejected after prototype replacement",
  () => {
    const brandedValues = [
      new Map(),
      new Date(),
      new ArrayBuffer(8),
      new DataView(
        new ArrayBuffer(8)
      )
    ];

    for (
      const value of brandedValues
    ) {
      Object.setPrototypeOf(
        value,
        Object.prototype
      );

      assert.throws(
        () => {
          compileMutationPack({
            output: value,

            pack: [
              makeValidMutation()
            ]
          });
        },
        /plain objects/
      );
    }
  }
);

test(
  "proxied source outputs are rejected before reflection traps execute",
  () => {
    let trapCalls = 0;

    const proxy =
      new Proxy(
        {
          value: 1
        },
        {
          getPrototypeOf() {
            trapCalls += 1;

            return Object.prototype;
          },

          ownKeys() {
            trapCalls += 1;

            return [
              "value"
            ];
          },

          getOwnPropertyDescriptor(
            target,
            key
          ) {
            trapCalls += 1;

            return Object
              .getOwnPropertyDescriptor(
                target,
                key
              );
          }
        }
      );

    assert.throws(
      () => {
        compileMutationPack({
          output: proxy,

          pack: []
        });
      },
      /Proxy values/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "proxied mutation results are rejected before reflection traps execute",
  () => {
    let trapCalls = 0;

    const proxy =
      new Proxy(
        {
          value: 1
        },
        {
          getPrototypeOf() {
            trapCalls += 1;

            return Object.prototype;
          },

          ownKeys() {
            trapCalls += 1;

            return [
              "value"
            ];
          }
        }
      );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate() {
                return proxy;
              }
            })
          ]
        });
      },
      /Proxy values/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "rejected native promises with throwing constructor getters are consumed safely",
  async () => {
    function mutation() {
      const rejected =
        Promise.reject(
          new Error("boom")
        );

      Object.defineProperty(
        rejected,
        "constructor",
        {
          configurable: true,

          get() {
            throw new Error(
              "constructor accessed"
            );
          }
        }
      );

      return rejected;
    }

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate: mutation
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );

    await new Promise(
      (resolve) =>
        setImmediate(resolve)
    );
  }
);

test(
  "native-code text inside an ordinary callback does not cause rejection",
  () => {
    function mutation(output) {
      const marker =
        "[native code]";

      return marker
        ? `${output}-safe`
        : output;
    }

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            mutate: mutation
          })
        ]
      });

    assert.equal(
      compiled[0].output,
      "original-safe"
    );
  }
);

test(
  "then accessors on mutation results are rejected without invocation",
  () => {
    let getterReads = 0;

    const result = {};

    Object.defineProperty(
      result,
      "then",
      {
        enumerable: true,
        configurable: true,

        get() {
          getterReads += 1;

          return undefined;
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate() {
                return result;
              }
            })
          ]
        });
      },
      /accessor properties/
    );

    assert.equal(
      getterReads,
      0
    );
  }
);

test(
  "non-native thenables are rejected without invoking then",
  () => {
    let thenCalls = 0;

    const thenable = {
      then() {
        thenCalls += 1;
      }
    };

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate() {
                return thenable;
              }
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );

    assert.equal(
      thenCalls,
      0
    );
  }
);

test(
  "class mutation callbacks are rejected before any mutation executes",
  () => {
    let mutationCalls = 0;

    class InvalidMutation {}

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              id: "first",

              mutate(output) {
                mutationCalls += 1;

                return output;
              }
            }),

            makeValidMutation({
              id: "class-mutation",
              mutate:
                InvalidMutation
            })
          ]
        });
      },
      /Class constructors cannot be used as mutation callbacks/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "class protection callbacks are rejected before mutations execute",
  () => {
    let mutationCalls = 0;

    class InvalidProtection {}

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationCalls += 1;

                return output;
              },

              protection: {
                description:
                  "Invalid class protection.",

                check:
                  InvalidProtection
              }
            })
          ]
        });
      },
      /Class constructors cannot be used as protection callbacks/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "rejected non-extensible native mutation promises are consumed safely",
  async () => {
    const harden = [
      Object.freeze,
      Object.seal,
      Object.preventExtensions
    ];

    for (
      const makeNonExtensible of harden
    ) {
      function mutation() {
        const rejected =
          Promise.reject(
            new Error("boom")
          );

        makeNonExtensible(
          rejected
        );

        return rejected;
      }

      assert.throws(
        () => {
          compileMutationPack({
            output: "original",

            pack: [
              makeValidMutation({
                mutate: mutation
              })
            ]
          });
        },
        /Async mutation functions are not supported/
      );
    }

    await new Promise(
      (resolve) =>
        setImmediate(resolve)
    );
  }
);

test(
  "rejected non-extensible native protection promises are consumed safely",
  async () => {
    const harden = [
      Object.freeze,
      Object.seal,
      Object.preventExtensions
    ];

    for (
      const makeNonExtensible of harden
    ) {
      function protection() {
        const rejected =
          Promise.reject(
            new Error("boom")
          );

        makeNonExtensible(
          rejected
        );

        return rejected;
      }

      const compiled =
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              protection: {
                description:
                  "Non-extensible promise protection.",
                check: protection
              }
            })
          ]
        });

      assert.throws(
        () => {
          compiled[0]
            .protectionCheck(
              "candidate"
            );
        },
        /Async protection checks are not supported/
      );
    }

    await new Promise(
      (resolve) =>
        setImmediate(resolve)
    );
  }
);

test(
  "generator mutation callbacks are rejected before any mutation executes",
  () => {
    let mutationCalls = 0;

    function* invalidMutation() {
      yield "invalid";
    }

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              id: "first",

              mutate(output) {
                mutationCalls += 1;

                return output;
              }
            }),

            makeValidMutation({
              id: "generator-mutation",
              mutate:
                invalidMutation
            })
          ]
        });
      },
      /Generator mutation functions are not supported/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "generator protection callbacks are rejected before mutations execute",
  () => {
    let mutationCalls = 0;

    function* invalidProtection() {
      yield true;
    }

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationCalls += 1;

                return output;
              },

              protection: {
                description:
                  "Invalid generator protection.",

                check:
                  invalidProtection
              }
            })
          ]
        });
      },
      /Generator protection checks are not supported/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "proxied metadata records are rejected before property traps execute",
  () => {
    let trapCalls = 0;

    function proxy(value) {
      return new Proxy(
        value,
        {
          get(target, key, receiver) {
            trapCalls += 1;

            return Reflect.get(
              target,
              key,
              receiver
            );
          },

          ownKeys(target) {
            trapCalls += 1;

            return Reflect.ownKeys(
              target
            );
          },

          getOwnPropertyDescriptor(
            target,
            key
          ) {
            trapCalls += 1;

            return Reflect
              .getOwnPropertyDescriptor(
                target,
                key
              );
          }
        }
      );
    }

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",
          pack: proxy([
            makeValidMutation()
          ])
        });
      },
      /Mutation pack must not be a Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            proxy(
              makeValidMutation()
            )
          ]
        });
      },
      /must not be a Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              scores: proxy({
                severity: 1,
                realism: 0.9,
                subtlety: 0.8,
                novelty: 0.7,
                fixability: 0.6
              })
            })
          ]
        });
      },
      /scores must not be a Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              protection: proxy({
                description:
                  "Valid protection.",

                check() {
                  return true;
                }
              })
            })
          ]
        });
      },
      /protection must not be a Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "mutation accessor metadata is rejected without invocation",
  () => {
    let getterReads = 0;

    const mutation =
      makeValidMutation();

    Object.defineProperty(
      mutation,
      "id",
      {
        enumerable: true,

        get() {
          getterReads += 1;

          return "accessor-id";
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",
          pack: [mutation]
        });
      },
      /must use data properties only/
    );

    assert.equal(
      getterReads,
      0
    );
  }
);

test(
  "protection accessor metadata is rejected without invocation",
  () => {
    let getterReads = 0;

    const protection = {
      check() {
        return true;
      }
    };

    Object.defineProperty(
      protection,
      "description",
      {
        enumerable: true,

        get() {
          getterReads += 1;

          return "Accessor protection.";
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              protection
            })
          ]
        });
      },
      /protection must use data properties only/
    );

    assert.equal(
      getterReads,
      0
    );
  }
);

test(
  "pack entry accessors are rejected without invocation",
  () => {
    let getterReads = 0;

    const pack = [];

    Object.defineProperty(
      pack,
      0,
      {
        enumerable: true,
        configurable: true,

        get() {
          getterReads += 1;

          return makeValidMutation();
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",
          pack
        });
      },
      /must be stored as a data property/
    );

    assert.equal(
      getterReads,
      0
    );
  }
);

test(
  "custom null-rooted prototypes are rejected before mutation execution",
  () => {
    class CustomOutput {
      constructor() {
        this.value = 1;
      }

      read() {
        return this.value;
      }
    }

    Object.setPrototypeOf(
      CustomOutput.prototype,
      null
    );

    let mutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output:
            new CustomOutput(),

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationCalls += 1;

                return output;
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "mutation callbacks do not receive captured metadata as this",
  () => {
    let callbackThis;

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            mutate(output) {
              callbackThis = this;

              if (
                this &&
                this.scores
              ) {
                this.scores.severity =
                  Number.NaN;
              }

              return `${output}-safe`;
            }
          })
        ]
      });

    assert.equal(
      Object.isFrozen(
        callbackThis
      ),
      true
    );

    assert.equal(
      Object.getPrototypeOf(
        callbackThis
      ),
      null
    );

    assert.equal(
      callbackThis.id,
      undefined
    );

    assert.equal(
      callbackThis.scores,
      undefined
    );

    assert.equal(
      compiled[0].severity,
      1
    );

    assert.equal(
      compiled[0].id,
      "wrong-value"
    );

    assert.equal(
      compiled[0].output,
      "original-safe"
    );
  }
);

test(
  "protection callbacks do not receive captured metadata as this",
  () => {
    let callbackThis;

    function protectionCheck(
      output
    ) {
      callbackThis = this;

      return (
        output === "candidate"
      );
    }

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            protection: {
              description:
                "Detached protection.",

              check:
                protectionCheck
            }
          })
        ]
      });

    assert.equal(
      compiled[0]
        .protectionCheck(
          "candidate"
        ),
      true
    );

    assert.equal(
      Object.isFrozen(
        callbackThis
      ),
      true
    );

    assert.equal(
      Object.getPrototypeOf(
        callbackThis
      ),
      null
    );

    assert.equal(
      callbackThis.description,
      undefined
    );

    assert.equal(
      callbackThis.check,
      undefined
    );
  }
);

test(
  "arrays with arbitrary array prototypes are rejected before mutation execution",
  () => {
    const customPrototype = [
      "inherited-value"
    ];

    const output = [
      "own-value"
    ];

    Object.setPrototypeOf(
      output,
      customPrototype
    );

    let mutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output,

          pack: [
            makeValidMutation({
              mutate(candidate) {
                mutationCalls += 1;

                return candidate;
              }
            })
          ]
        });
      },
      /custom array prototypes/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "prototype-replaced AbortController source values are rejected before mutation execution",
  () => {
    if (
      typeof AbortController !==
      "function"
    ) {
      return;
    }

    const controller =
      new AbortController();

    Object.setPrototypeOf(
      controller,
      Object.prototype
    );

    let mutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output: controller,

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationCalls += 1;

                return output;
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "prototype-replaced AbortController mutation results are rejected",
  () => {
    if (
      typeof AbortController !==
      "function"
    ) {
      return;
    }

    let mutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate() {
                mutationCalls += 1;

                const controller =
                  new AbortController();

                Object.setPrototypeOf(
                  controller,
                  Object.prototype
                );

                return controller;
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      mutationCalls,
      1
    );
  }
);

test(
  "prototype-replaced CountQueuingStrategy values are rejected",
  () => {
    if (
      typeof CountQueuingStrategy !==
      "function"
    ) {
      return;
    }

    const strategy =
      new CountQueuingStrategy({
        highWaterMark: 1
      });

    Object.setPrototypeOf(
      strategy,
      Object.prototype
    );

    let mutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output: strategy,

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationCalls += 1;

                return output;
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "prototype-replaced ByteLengthQueuingStrategy values are rejected",
  () => {
    if (
      typeof ByteLengthQueuingStrategy !==
      "function"
    ) {
      return;
    }

    const strategy =
      new ByteLengthQueuingStrategy({
        highWaterMark: 1
      });

    Object.setPrototypeOf(
      strategy,
      Object.prototype
    );

    let mutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output: strategy,

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationCalls += 1;

                return output;
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "prototype-replaced branded stream wrappers are rejected",
  () => {
    const cases = [
      [
        "TextEncoderStream",
        () => new TextEncoderStream()
      ],
      [
        "TextDecoderStream",
        () => new TextDecoderStream()
      ],
      [
        "CompressionStream",
        () => new CompressionStream(
          "gzip"
        )
      ],
      [
        "DecompressionStream",
        () => new DecompressionStream(
          "gzip"
        )
      ]
    ];

    let exercised = 0;

    for (
      const [
        constructorName,
        createValue
      ] of cases
    ) {
      if (
        typeof globalThis[
          constructorName
        ] !== "function"
      ) {
        continue;
      }

      exercised += 1;

      const value =
        createValue();

      Object.setPrototypeOf(
        value,
        Object.prototype
      );

      let mutationCalls = 0;

      assert.throws(
        () => {
          compileMutationPack({
            output: value,

            pack: [
              makeValidMutation({
                mutate(output) {
                  mutationCalls += 1;

                  return output;
                }
              })
            ]
          });
        },
        /plain objects/
      );

      assert.equal(
        mutationCalls,
        0
      );
    }

    assert.ok(
      exercised > 0,
      "Expected at least one stream-wrapper global."
    );
  }
);

test(
  "comment-separated class mutation callbacks are rejected before any mutation executes",
  () => {
    let mutationCalls = 0;

    const CommentSeparatedClass =
      class/**/Callback {};

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              id: "first",

              mutate(output) {
                mutationCalls += 1;

                return output;
              }
            }),

            makeValidMutation({
              id: "second",
              mutate:
                CommentSeparatedClass
            })
          ]
        });
      },
      /class constructor/i
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "comment-separated class protection callbacks are rejected before mutations execute",
  () => {
    let mutationCalls = 0;

    const CommentSeparatedClass =
      class/**/Protection {};

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate(output) {
                mutationCalls += 1;

                return output;
              },

              protection: {
                description:
                  "Invalid class protection.",
                check:
                  CommentSeparatedClass
              }
            })
          ]
        });
      },
      /class constructor/i
    );

    assert.equal(
      mutationCalls,
      0
    );
  }
);

test(
  "prototype-replaced PerformanceObserver values are rejected before cloning",
  () => {
    const {
      PerformanceObserver
    } = require(
      "node:perf_hooks"
    );

    function createObserver() {
      const observer =
        new PerformanceObserver(
          () => {}
        );

      Object.setPrototypeOf(
        observer,
        Object.prototype
      );

      return observer;
    }

    let sourceMutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output:
            createObserver(),

          pack: [
            makeValidMutation({
              mutate(output) {
                sourceMutationCalls += 1;

                return output;
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      sourceMutationCalls,
      0
    );

    let resultMutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output: "original",

          pack: [
            makeValidMutation({
              mutate() {
                resultMutationCalls += 1;

                return createObserver();
              }
            })
          ]
        });
      },
      /plain objects/
    );

    assert.equal(
      resultMutationCalls,
      1
    );
  }
);

test(
  "ordinary callback methods named class remain valid",
  () => {
    const spacedMutation = ({
      class (output) {
        return `${output}-spaced`;
      }
    }).class;

    const commentedProtection = ({
      class/**/(output) {
        return output === "good";
      }
    }).class;

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            mutate:
              spacedMutation,

            protection: {
              description:
                "Method named class remains valid.",

              check:
                commentedProtection
            }
          })
        ]
      });

    assert.equal(
      compiled[0].output,
      "original-spaced"
    );

    assert.equal(
      compiled[0]
        .protectionCheck(
          "good"
        ),
      true
    );

    assert.equal(
      compiled[0]
        .protectionCheck(
          "bad"
        ),
      false
    );
  }
);

test(
  "protection results with then accessors are rejected without invoking getters",
  () => {
    let getterReads = 0;

    const result = {};

    Object.defineProperty(
      result,
      "then",
      {
        configurable: true,
        enumerable: true,

        get() {
          getterReads += 1;

          return undefined;
        }
      }
    );

    const compiled =
      compileMutationPack({
        output: "original",

        pack: [
          makeValidMutation({
            protection: {
              description:
                "Protection must return boolean.",

              check() {
                return result;
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

          mutations:
            compiled,

          knownGoodOutput:
            "original"
        });
      },
      /Protection check must return a boolean/
    );

    assert.equal(
      getterReads,
      0
    );
  }
);

test(
  "prototype-replaced Crypto values are rejected before cloning",
  () => {
    if (
      typeof globalThis.Crypto !==
        "function" ||
      globalThis.crypto ===
        undefined
    ) {
      return;
    }

    const cryptoValue =
      globalThis.crypto;

    const originalPrototype =
      Object.getPrototypeOf(
        cryptoValue
      );

    let sourceMutationCalls = 0;
    let resultMutationCalls = 0;

    try {
      Object.setPrototypeOf(
        cryptoValue,
        Object.prototype
      );

      assert.throws(
        () => {
          compileMutationPack({
            output:
              cryptoValue,

            pack: [
              makeValidMutation({
                mutate(output) {
                  sourceMutationCalls += 1;

                  return output;
                }
              })
            ]
          });
        },
        /plain objects/
      );

      assert.equal(
        sourceMutationCalls,
        0
      );

      assert.throws(
        () => {
          compileMutationPack({
            output: "original",

            pack: [
              makeValidMutation({
                mutate() {
                  resultMutationCalls += 1;

                  return cryptoValue;
                }
              })
            ]
          });
        },
        /plain objects/
      );

      assert.equal(
        resultMutationCalls,
        1
      );
    } finally {
      Object.setPrototypeOf(
        cryptoValue,
        originalPrototype
      );
    }
  }
);

test(
  "top-level compile option accessors are rejected without invocation",
  () => {
    let getterReads = 0;

    const options = {};

    Object.defineProperties(
      options,
      {
        output: {
          configurable: true,

          get() {
            getterReads += 1;

            return "original";
          }
        },

        pack: {
          configurable: true,

          get() {
            getterReads += 1;

            return [];
          }
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack(
          options
        );
      },
      /Mutation Pack options must use data properties only/
    );

    assert.equal(
      getterReads,
      0
    );
  }
);

test(
  "proxied top-level compile options are rejected before traps execute",
  () => {
    let trapCalls = 0;

    const options =
      new Proxy(
        {
          output: "original",
          pack: []
        },
        {
          get() {
            trapCalls += 1;

            return undefined;
          },

          ownKeys() {
            trapCalls += 1;

            return [];
          },

          getOwnPropertyDescriptor() {
            trapCalls += 1;

            return undefined;
          }
        }
      );

    assert.throws(
      () => {
        compileMutationPack(
          options
        );
      },
      /Mutation Pack options must not be a Proxy/
    );

    assert.equal(
      trapCalls,
      0
    );
  }
);

test(
  "frozen state is not recomputed for every property",
  () => {
    const originalIsFrozen =
      Object.isFrozen;

    let isFrozenCalls = 0;

    Object.isFrozen =
      function countedIsFrozen(
        value
      ) {
        isFrozenCalls += 1;

        return originalIsFrozen(
          value
        );
      };

    try {
      const wideOutput = {};

      for (
        let index = 0;
        index < 1000;
        index += 1
      ) {
        wideOutput[
          `key-${index}`
        ] = index;
      }

      Object.freeze(
        wideOutput
      );

      compileMutationPack({
        output:
          wideOutput,
        pack: []
      });
    } finally {
      Object.isFrozen =
        originalIsFrozen;
    }

    assert.ok(
      isFrozenCalls <= 4,
      `Expected frozen-state checks to stay constant, got ${isFrozenCalls}.`
    );
  }
);

test(
  "partially constrained array length is rejected while fully frozen arrays remain valid",
  () => {
    const constrainedArray = [
      "value"
    ];

    Object.defineProperty(
      constrainedArray,
      "length",
      {
        writable: false
      }
    );

    let mutationCalls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output:
            constrainedArray,

          pack: [
            makeValidMutation({
              mutate() {
                mutationCalls += 1;

                return "mutated";
              }
            })
          ]
        });
      },
      /array length must use ordinary writable semantics/
    );

    assert.equal(
      mutationCalls,
      0
    );

    const frozenArray =
      Object.freeze([
        "value"
      ]);

    assert.doesNotThrow(
      () => {
        compileMutationPack({
          output:
            frozenArray,
          pack: []
        });
      }
    );
  }
);

test(
  "shared aliases short-circuit repeated intrinsic and host-brand probing",
  () => {
    const runtimeTypes =
      require(
        "node:util"
      ).types;

    const originalIsDate =
      runtimeTypes.isDate;

    let isDateCalls = 0;

    runtimeTypes.isDate =
      function countedIsDate(
        value
      ) {
        isDateCalls += 1;

        return originalIsDate(
          value
        );
      };

    try {
      const shared = {
        value: "shared"
      };

      const aliases =
        Array(2000).fill(
          shared
        );

      compileMutationPack({
        output:
          aliases,
        pack: []
      });
    } finally {
      runtimeTypes.isDate =
        originalIsDate;
    }

    assert.ok(
      isDateCalls <= 8,
      `Expected shared aliases to reuse validation state, got ${isDateCalls} intrinsic brand checks.`
    );
  }
);

test(
  "prototype-replaced Navigator values are rejected before cloning",
  () => {
    if (
      typeof globalThis.Navigator !==
        "function" ||
      globalThis.navigator ===
        undefined
    ) {
      return;
    }

    const navigatorValue =
      globalThis.navigator;

    const originalPrototype =
      Object.getPrototypeOf(
        navigatorValue
      );

    let sourceMutationCalls = 0;
    let resultMutationCalls = 0;

    try {
      Object.setPrototypeOf(
        navigatorValue,
        Object.prototype
      );

      assert.throws(
        () => {
          compileMutationPack({
            output:
              navigatorValue,

            pack: [
              makeValidMutation({
                mutate(output) {
                  sourceMutationCalls += 1;

                  return output;
                }
              })
            ]
          });
        },
        /plain objects/
      );

      assert.equal(
        sourceMutationCalls,
        0
      );

      assert.throws(
        () => {
          compileMutationPack({
            output: "original",

            pack: [
              makeValidMutation({
                mutate() {
                  resultMutationCalls += 1;

                  return navigatorValue;
                }
              })
            ]
          });
        },
        /plain objects/
      );

      assert.equal(
        resultMutationCalls,
        1
      );
    } finally {
      Object.setPrototypeOf(
        navigatorValue,
        originalPrototype
      );
    }
  }
);
