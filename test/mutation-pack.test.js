const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const {
  performance
} = require("node:perf_hooks");

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
      return output;
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

      check() {
        return true;
      }
    },

    ...overrides
  };
}

test(
  "valid pack compiles to engine format",
  () => {
    const compiled =
      compileMutationPack({
        output: {
          value: "good"
        },

        pack: [
          makeValidMutation({
            mutate(output) {
              output.value = "bad";
              return output;
            }
          })
        ]
      });

    assert.equal(
      compiled.length,
      1
    );

    assert.equal(
      compiled[0].id,
      "wrong-value"
    );

    assert.equal(
      compiled[0].type,
      "value-substitution"
    );

    assert.equal(
      compiled[0].output.value,
      "bad"
    );

    assert.equal(
      compiled[0].severity,
      1
    );

    assert.equal(
      typeof compiled[0]
        .protectionCheck,
      "function"
    );
  }
);

test(
  "empty pack compiles safely",
  () => {
    assert.deepEqual(
      compileMutationPack({
        output: {
          value: 1
        },
        pack: []
      }),
      []
    );
  }
);

test(
  "pack metadata is validated",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "good",
          pack: [
            makeValidMutation(),
            makeValidMutation()
          ]
        });
      },
      /Duplicate mutation id/
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

          pack: [
            makeValidMutation({
              scores: {
                severity: 2,
                realism: 1,
                subtlety: 1,
                novelty: 1,
                fixability: 1
              }
            })
          ]
        });
      },
      /severity must be a number between 0 and 1/
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

          pack: [
            makeValidMutation({
              protection: {
                description:
                  "Missing check."
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
  "sparse packs are rejected",
  () => {
    const pack =
      new Array(2);

    pack[1] =
      makeValidMutation({
        id: "second"
      });

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",
          pack
        });
      },
      /Mutation at index 0 must be present/
    );
  }
);

test(
  "entire pack validates before mutations execute",
  () => {
    let calls = 0;

    const first =
      makeValidMutation({
        id: "first",

        mutate(output) {
          calls += 1;
          return output;
        }
      });

    const invalid =
      makeValidMutation({
        id: "second",
        type: ""
      });

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",
          pack: [
            first,
            invalid
          ]
        });
      },
      /type must be a non-empty string/
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "validated pack is snapshotted before mutation execution",
  () => {
    const pack = [];

    pack.push(
      makeValidMutation({
        id: "first",

        mutate(output) {
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
        output: "good",
        pack
      });

    assert.deepEqual(
      compiled.map(
        (mutation) =>
          mutation.id
      ),
      [
        "first",
        "second"
      ]
    );
  }
);

test(
  "each mutation receives isolated canonical data",
  () => {
    const original = {
      nested: {
        value: 0
      }
    };

    const compiled =
      compileMutationPack({
        output: original,

        pack: [
          makeValidMutation({
            id: "one",

            mutate(output) {
              output.nested.value = 1;
              return output;
            }
          }),

          makeValidMutation({
            id: "two",

            mutate(output) {
              output.nested.value = 2;
              return output;
            }
          })
        ]
      });

    assert.equal(
      original.nested.value,
      0
    );

    assert.equal(
      compiled[0].output
        .nested.value,
      1
    );

    assert.equal(
      compiled[1].output
        .nested.value,
      2
    );

    assert.notEqual(
      compiled[0].output,
      compiled[1].output
    );
  }
);

test(
  "shared returned objects are isolated",
  () => {
    const shared = {
      value: 0
    };

    const compiled =
      compileMutationPack({
        output: "good",

        pack: [
          makeValidMutation({
            id: "one",

            mutate() {
              shared.value = 1;
              return shared;
            }
          }),

          makeValidMutation({
            id: "two",

            mutate() {
              shared.value = 2;
              return shared;
            }
          })
        ]
      });

    assert.equal(
      compiled[0].output.value,
      1
    );

    assert.equal(
      compiled[1].output.value,
      2
    );

    assert.notEqual(
      compiled[0].output,
      shared
    );
  }
);

test(
  "compiled mutable outputs are deeply frozen",
  () => {
    const compiled =
      compileMutationPack({
        output: {
          nested: {
            value: 1
          }
        },

        pack: [
          makeValidMutation()
        ]
      });

    assert.equal(
      Object.isFrozen(
        compiled[0].output
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        compiled[0].output.nested
      ),
      true
    );
  }
);

test(
  "protection checks receive isolated canonical data",
  () => {
    let protectionInput;

    const compiled =
      compileMutationPack({
        output: {
          value: 1
        },

        pack: [
          makeValidMutation({
            protection: {
              description:
                "Protection isolation.",

              check(output) {
                protectionInput =
                  output;

                output.value =
                  999;

                return true;
              }
            }
          })
        ]
      });

    const candidate = {
      value: 5
    };

    assert.equal(
      compiled[0]
        .protectionCheck(
          candidate
        ),
      true
    );

    assert.equal(
      candidate.value,
      5
    );

    assert.notEqual(
      protectionInput,
      candidate
    );
  }
);

test(
  "compiled pack works with the improvement loop",
  () => {
    const mutations =
      compileMutationPack({
        output:
          "Status: approved\nAmount: 100",

        pack: [
          {
            id: "wrong-amount",
            type:
              "value-substitution",
            description:
              "Changes the amount.",

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
                "Amount must be 100.",

              check(output) {
                return (
                  output.includes(
                    "Amount: 100"
                  )
                );
              }
            }
          }
        ]
      });

    const result =
      runImprovementLoop({
        evaluator(output) {
          return output.includes(
            "Status: approved"
          );
        },

        mutations,

        knownGoodOutput:
          "Status: approved\nAmount: 100"
      });

    assert.equal(
      result.before
        .survivors.length,
      1
    );

    assert.equal(
      result.after
        .survivors.length,
      0
    );

    assert.equal(
      result.improvement,
      1
    );
  }
);

test(
  "async mutation callbacks are rejected before execution",
  () => {
    let calls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

          pack: [
            makeValidMutation({
              id: "first",

              mutate(output) {
                calls += 1;
                return output;
              }
            }),

            makeValidMutation({
              id: "async",

              async mutate(output) {
                return output;
              }
            })
          ]
        });
      },
      /Async mutation functions are not supported/
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "async protection callbacks are rejected before mutation execution",
  () => {
    let calls = 0;

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

          pack: [
            makeValidMutation({
              mutate(output) {
                calls += 1;
                return output;
              },

              protection: {
                description:
                  "Async protection.",

                async check() {
                  return true;
                }
              }
            })
          ]
        });
      },
      /Async protection checks are not supported/
    );

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "generator callbacks are rejected before mutation execution",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

          pack: [
            makeValidMutation({
              *mutate() {
                yield "bad";
              }
            })
          ]
        });
      },
      /Generator mutation functions are not supported/
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

          pack: [
            makeValidMutation({
              protection: {
                description:
                  "Generator protection.",

                *check() {
                  yield true;
                }
              }
            })
          ]
        });
      },
      /Generator protection checks are not supported/
    );
  }
);

test(
  "bound callback wrappers are rejected",
  () => {
    const boundMutation =
      (async function mutation(
        output
      ) {
        return output;
      }).bind(null);

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

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
  }
);

test(
  "native Promise mutation results are rejected safely",
  async () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: "good",

          pack: [
            makeValidMutation({
              mutate() {
                return Promise.reject(
                  new Error(
                    "mutation rejection"
                  )
                );
              }
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
  "native Promise protection results are rejected safely",
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
                "Promise protection.",

              check() {
                return Promise.reject(
                  new Error(
                    "protection rejection"
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

          knownGoodOutput:
            "good"
        });
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
  "protection results must be boolean",
  () => {
    const compiled =
      compileMutationPack({
        output: "good",

        pack: [
          makeValidMutation({
            protection: {
              description:
                "Invalid protection.",

              check() {
                return "yes";
              }
            }
          })
        ]
      });

    assert.throws(
      () => {
        compiled[0]
          .protectionCheck(
            "good"
          );
      },
      /Protection check must return a boolean/
    );
  }
);

test(
  "Proxy data is rejected before traps execute",
  () => {
    let traps = 0;

    const proxy =
      new Proxy(
        {
          value: 1
        },
        {
          getPrototypeOf() {
            traps += 1;
            return Object.prototype;
          },

          ownKeys() {
            traps += 1;
            return [
              "value"
            ];
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
      /must not contain Proxy values/
    );

    assert.equal(
      traps,
      0
    );
  }
);

test(
  "accessor-backed data is rejected without invoking getters",
  () => {
    let reads = 0;

    const output = {};

    Object.defineProperty(
      output,
      "value",
      {
        enumerable: true,

        get() {
          reads += 1;
          return 1;
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output,
          pack: []
        });
      },
      /must not contain accessor properties/
    );

    assert.equal(
      reads,
      0
    );
  }
);

test(
  "metadata accessors and top-level option accessors are rejected without invocation",
  () => {
    let reads = 0;

    const mutation =
      makeValidMutation();

    Object.defineProperty(
      mutation,
      "id",
      {
        enumerable: true,

        get() {
          reads += 1;
          return "bad";
        }
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: "good",
          pack: [
            mutation
          ]
        });
      },
      /data properties only/
    );

    const options = {};

    Object.defineProperty(
      options,
      "output",
      {
        enumerable: true,

        get() {
          reads += 1;
          return "good";
        }
      }
    );

    Object.defineProperty(
      options,
      "pack",
      {
        value: [],
        enumerable: true
      }
    );

    assert.throws(
      () => {
        compileMutationPack(
          options
        );
      },
      /data properties only/
    );

    assert.equal(
      reads,
      0
    );
  }
);

test(
  "ordinary cross-realm objects and arrays are canonicalized",
  () => {
    const foreignObject =
      vm.runInNewContext(`
        ({
          value: 1,
          nested: {
            ok: true
          }
        })
      `);

    const foreignArray =
      vm.runInNewContext(`
        [
          1,
          {
            value: 2
          }
        ]
      `);

    const objectCompiled =
      compileMutationPack({
        output:
          foreignObject,

        pack: [
          makeValidMutation()
        ]
      });

    const arrayCompiled =
      compileMutationPack({
        output:
          foreignArray,

        pack: [
          makeValidMutation()
        ]
      });

    assert.equal(
      objectCompiled[0]
        .output.value,
      1
    );

    assert.equal(
      objectCompiled[0]
        .output.nested.ok,
      true
    );

    assert.equal(
      arrayCompiled[0]
        .output[1].value,
      2
    );
  }
);

test(
  "custom runtime object types are rejected by the canonical boundary",
  () => {
    class Custom {
      constructor() {
        this.value = 1;
      }
    }

    class CustomArray
      extends Array {}

    for (
      const value of [
        new Custom(),
        new CustomArray(
          1,
          2
        ),
        Buffer.from(
          "hello"
        ),
        new SharedArrayBuffer(
          8
        )
      ]
    ) {
      assert.throws(
        () => {
          compileMutationPack({
            output: value,
            pack: []
          });
        },
        /ordinary|canonical/
      );
    }
  }
);

test(
  "runtime extensibility and frozen descriptor state are normalized",
  () => {
    const object = {
      value: 1
    };

    Object.preventExtensions(
      object
    );

    let sawExtensible =
      false;

    const objectCompiled =
      compileMutationPack({
        output: object,

        pack: [
          makeValidMutation({
            mutate(output) {
              sawExtensible =
                Object.isExtensible(
                  output
                );

              output.added =
                true;

              return output;
            }
          })
        ]
      });

    assert.equal(
      Object.isExtensible(
        object
      ),
      false
    );

    assert.equal(
      sawExtensible,
      true
    );

    assert.equal(
      objectCompiled[0]
        .output.added,
      true
    );

    const frozenArray =
      Object.freeze([
        1,
        2
      ]);

    const arrayCompiled =
      compileMutationPack({
        output:
          frozenArray,

        pack: [
          makeValidMutation({
            mutate(output) {
              output.push(3);
              return output;
            }
          })
        ]
      });

    assert.deepEqual(
      arrayCompiled[0].output,
      [
        1,
        2,
        3
      ]
    );
  }
);

test(
  "inherited runtime state is ignored while own data is preserved",
  () => {
    const foreignObject =
      vm.runInNewContext(`
        Object.prototype.marker =
          "foreign";

        ({
          value: 1
        })
      `);

    let inheritedMarker;

    const compiled =
      compileMutationPack({
        output:
          foreignObject,

        pack: [
          makeValidMutation({
            mutate(output) {
              inheritedMarker =
                output.marker;

              return output;
            }
          })
        ]
      });

    assert.equal(
      inheritedMarker,
      undefined
    );

    assert.equal(
      compiled[0]
        .output.value,
      1
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          compiled[0].output,
          "marker"
        ),
      false
    );
  }
);

test(
  "own non-function then fields remain ordinary data",
  () => {
    const compiled =
      compileMutationPack({
        output: {
          value: "good",
          then:
            "plain-data"
        },

        pack: [
          makeValidMutation({
            mutate(output) {
              output.value =
                "changed";

              return output;
            }
          })
        ]
      });

    assert.equal(
      compiled[0]
        .output.then,
      "plain-data"
    );

    assert.equal(
      compiled[0]
        .output.value,
      "changed"
    );
  }
);

test(
  "functions cannot appear inside canonical data",
  () => {
    assert.throws(
      () => {
        compileMutationPack({
          output: {
            value: 1,

            callback() {
              return true;
            }
          },

          pack: []
        });
      },
      /canonical data values/
    );
  }
);

test(
  "symbol and non-enumerable own properties are rejected",
  () => {
    const symbolValue = {
      value: 1
    };

    symbolValue[
      Symbol("secret")
    ] = 2;

    assert.throws(
      () => {
        compileMutationPack({
          output:
            symbolValue,
          pack: []
        });
      },
      /symbol-keyed properties/
    );

    const hidden = {
      value: 1
    };

    Object.defineProperty(
      hidden,
      "secret",
      {
        value: 2,
        enumerable: false
      }
    );

    assert.throws(
      () => {
        compileMutationPack({
          output: hidden,
          pack: []
        });
      },
      /non-enumerable own data properties/
    );
  }
);

test(
  "cycles and shared references survive canonicalization",
  () => {
    const shared = {
      value: 1
    };

    const source = {
      first: shared,
      second: shared
    };

    source.self =
      source;

    const compiled =
      compileMutationPack({
        output: source,

        pack: [
          makeValidMutation()
        ]
      });

    const result =
      compiled[0].output;

    assert.equal(
      result.first,
      result.second
    );

    assert.equal(
      result.self,
      result
    );

    assert.equal(
      Object.isFrozen(
        result
      ),
      true
    );
  }
);

test(
  "callbacks receive an inert this receiver",
  () => {
    let mutationThis;
    let protectionThis;

    const compiled =
      compileMutationPack({
        output: "good",

        pack: [
          makeValidMutation({
            mutate(output) {
              mutationThis =
                this;

              return output;
            },

            protection: {
              description:
                "Receiver check.",

              check() {
                protectionThis =
                  this;

                return true;
              }
            }
          })
        ]
      });

    compiled[0]
      .protectionCheck(
        "good"
      );

    assert.equal(
      Object.getPrototypeOf(
        mutationThis
      ),
      null
    );

    assert.equal(
      Object.isFrozen(
        mutationThis
      ),
      true
    );

    assert.equal(
      protectionThis,
      mutationThis
    );
  }
);

test(
  "20k distinct ordinary objects stay within a practical linear-time budget",
  () => {
    const output =
      Array.from(
        {
          length: 20000
        },
        (_, index) => ({
          x: index
        })
      );

    const start =
      performance.now();

    compileMutationPack({
      output,
      pack: []
    });

    const elapsed =
      performance.now() -
      start;

    assert.ok(
      elapsed < 2000,
      `20k distinct objects took ${elapsed.toFixed(2)}ms`
    );
  }
);

test(
  "deep canonical graphs do not depend on the JavaScript call stack",
  () => {
    const depth = 10000;

    const source = {
      value: 0
    };

    let cursor =
      source;

    for (
      let index = 1;
      index <= depth;
      index += 1
    ) {
      cursor.next = {
        value: index
      };

      cursor =
        cursor.next;
    }

    const compiled =
      compileMutationPack({
        output: source,

        pack: [
          makeValidMutation()
        ]
      });

    let result =
      compiled[0].output;

    for (
      let index = 0;
      index < depth;
      index += 1
    ) {
      result =
        result.next;
    }

    assert.equal(
      result.value,
      depth
    );

    assert.equal(
      Object.isFrozen(
        compiled[0].output
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        result
      ),
      true
    );
  }
);


test("missing Promise observation authority fails before mutation callbacks execute", () => {
  const modulePath = require.resolve("../src/mutation-pack");
  const code = `
    "use strict";
    const NativePromise = Promise;
    const descriptor = Object.getOwnPropertyDescriptor(NativePromise.prototype, "then");
    Object.defineProperty(NativePromise.prototype, "then", {
      value: null, writable: true, enumerable: false, configurable: true
    });
    const { compileMutationPack } = require(${JSON.stringify(require.resolve("../src/mutation-pack"))});
    Object.defineProperty(NativePromise.prototype, "then", descriptor);
    let calls = 0;
    try {
      compileMutationPack({
        output: { ok: true },
        pack: [{
          id: "x", type: "x", description: "x",
          mutate(value) { calls += 1; return value; },
          scores: { severity: 1, realism: 1, subtlety: 1, novelty: 1, fixability: 1 },
          protection: { description: "x", check() { calls += 1; return true; } }
        }]
      });
      process.exit(12);
    } catch {}
    if (calls !== 0) process.exit(13);
  `;
  const { spawnSync } = require("node:child_process");
  const result = spawnSync(process.execPath, ["-e", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
