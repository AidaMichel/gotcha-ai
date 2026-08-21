"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const vm =
  require("node:vm");

const {
  cloneAiData
} = require("../src/ai-data");

const {
  runContractAttacks
} = require(
  "../src/contract-attacks"
);

function makeContract() {
  return {
    version: 1,
    status: "confirmed",
    task:
      "Return the approved time.",
    rules: [
      {
        id: "time-rule",
        statement:
          "Time must be 3 PM.",
        kind: "required",
        severity: "critical"
      }
    ]
  };
}

function makeEmptyGeneratorOutput() {
  return {
    version: 1,
    task:
      "Return the approved time.",
    attacks: []
  };
}

function makeOptions(
  overrides = {}
) {
  return {
    contract:
      makeContract(),

    input: {
      request:
        "Return the time."
    },

    expectedOutput: {
      time: "3 PM"
    },

    evaluator() {
      return true;
    },

    generator() {
      return (
        makeEmptyGeneratorOutput()
      );
    },

    ...overrides
  };
}

async function captureUnhandled(
  callback
) {
  let unhandled = null;

  function onUnhandled(
    reason
  ) {
    unhandled = reason;
  }

  process.on(
    "unhandledRejection",
    onUnhandled
  );

  try {
    await callback();

    await new Promise(
      (resolve) =>
        setImmediate(resolve)
    );

    return unhandled;
  } finally {
    process.removeListener(
      "unhandledRejection",
      onUnhandled
    );
  }
}

test(
  "cloneAiData canonicalizes cross-realm plain objects and arrays",
  () => {
    const value =
      vm.runInNewContext(`({
        request: "x",
        nested: {
          ok: true
        },
        values: [1, 2, 3]
      })`);

    const cloned =
      cloneAiData(value);

    assert.deepEqual(
      cloned,
      {
        request: "x",
        nested: {
          ok: true
        },
        values: [1, 2, 3]
      }
    );

    assert.equal(
      Object.getPrototypeOf(cloned),
      Object.prototype
    );

    assert.equal(
      Object.getPrototypeOf(
        cloned.values
      ),
      Array.prototype
    );
  }
);

test(
  "cloneAiData rejects spoofed ordinary-object prototype signatures",
  () => {
    const spoofedPrototype =
      Object.create(null);

    Object.defineProperty(
      spoofedPrototype,
      "constructor",
      {
        value: Object,
        enumerable: false,
        configurable: true,
        writable: true
      }
    );

    const value =
      Object.create(
        spoofedPrototype
      );

    value.safe = true;

    assert.throws(
      () =>
        cloneAiData(value),
      /plain object/
    );
  }
);

test(
  "cloneAiData rejects spoofed ordinary-array prototype signatures",
  () => {
    const value = [];

    const spoofedPrototype =
      Object.create(
        Object.prototype
      );

    Object.defineProperty(
      spoofedPrototype,
      "constructor",
      {
        value: Array,
        enumerable: false,
        configurable: true,
        writable: true
      }
    );

    Object.setPrototypeOf(
      value,
      spoofedPrototype
    );

    assert.throws(
      () =>
        cloneAiData(value),
      /ordinary array/
    );
  }
);

test(
  "cloneAiData still rejects cross-realm custom prototypes",
  () => {
    const value =
      vm.runInNewContext(`
        new (class Example {
          constructor() {
            this.value = 1;
          }
        })()
      `);

    assert.throws(
      () =>
        cloneAiData(value),
      /plain object/
    );
  }
);

test(
  "cloneAiData rejects prototype-tampered hidden-slot runtime objects",
  () => {
    const candidates = [];

    if (
      typeof WeakRef ===
        "function"
    ) {
      candidates.push(
        new WeakRef({})
      );
    }

    if (
      typeof FinalizationRegistry ===
        "function"
    ) {
      candidates.push(
        new FinalizationRegistry(
          () => {}
        )
      );
    }

    if (
      typeof Intl === "object" &&
      Intl !== null &&
      typeof Intl.DateTimeFormat ===
        "function"
    ) {
      candidates.push(
        new Intl.DateTimeFormat()
      );
    }

    if (
      typeof Headers ===
        "function"
    ) {
      candidates.push(
        new Headers()
      );
    }

    if (
      typeof FormData ===
        "function"
    ) {
      candidates.push(
        new FormData()
      );
    }

    if (
      typeof WebAssembly ===
        "object" &&
      WebAssembly !== null
    ) {
      const module =
        new WebAssembly.Module(
          new Uint8Array([
            0,
            97,
            115,
            109,
            1,
            0,
            0,
            0
          ])
        );

      candidates.push(module);

      candidates.push(
        new WebAssembly.Instance(
          module
        )
      );
    }

    for (const value of candidates) {
      const originalPrototype =
        Object.getPrototypeOf(value);

      try {
        Object.setPrototypeOf(
          value,
          Object.prototype
        );

        assert.throws(
          () =>
            cloneAiData(value),
          /unsupported runtime object|symbol-keyed properties/
        );
      } finally {
        Object.setPrototypeOf(
          value,
          originalPrototype
        );
      }
    }
  }
);

test(
  "rejected async evaluators are observed before the deterministic async error is reported",
  async () => {
    const unhandled =
      await captureUnhandled(
        async () => {
          await assert.rejects(
            runContractAttacks(
              makeOptions({
                async evaluator() {
                  throw new Error(
                    "evaluator rejection"
                  );
                }
              })
            ),
            /Async checks are not supported/
          );
        }
      );

    assert.equal(
      unhandled,
      null
    );
  }
);

test(
  "Promise intrinsic tampering fails before evaluator or generator execution",
  async () => {
    const originalSpecies =
      Object.getOwnPropertyDescriptor(
        Promise,
        Symbol.species
      );

    let getterCalls = 0;
    let evaluatorCalls = 0;
    let generatorCalls = 0;
    let returned;

    Object.defineProperty(
      Promise,
      Symbol.species,
      {
        configurable: true,

        get() {
          getterCalls += 1;
          throw new Error(
            "species getter executed"
          );
        }
      }
    );

    try {
      returned =
        runContractAttacks(
          makeOptions({
            evaluator() {
              evaluatorCalls += 1;
              return true;
            },

            generator() {
              generatorCalls += 1;
              return (
                makeEmptyGeneratorOutput()
              );
            }
          })
        );
    } finally {
      Object.defineProperty(
        Promise,
        Symbol.species,
        originalSpecies
      );
    }

    await assert.rejects(
      returned,
      /Promise intrinsic integrity check failed/
    );

    assert.equal(
      getterCalls,
      0
    );

    assert.equal(
      evaluatorCalls,
      0
    );

    assert.equal(
      generatorCalls,
      0
    );
  }
);

test(
  "cross-realm generator Promises are bridged without foreign hooks",
  async () => {
    const foreignPromise =
      vm.runInNewContext(
        `Promise.resolve({
          version: 1,
          task: "Return the approved time.",
          attacks: []
        })`
      );

    const result =
      await runContractAttacks(
        makeOptions({
          generator() {
            return foreignPromise;
          }
        })
      );

    assert.equal(
      result.baselinePassed,
      true
    );
  }
);

test(
  "Promise subclasses are bridged without executing Symbol.species",
  async () => {
    let speciesCalls = 0;

    class CustomPromise
      extends Promise {
      static get [Symbol.species]() {
        speciesCalls += 1;
        return Promise;
      }
    }

    const value =
      new CustomPromise(
        (resolve) =>
          resolve(
            makeEmptyGeneratorOutput()
          )
      );

    const result =
      await runContractAttacks(
        makeOptions({
          generator() {
            return value;
          }
        })
      );

    assert.equal(
      result.baselinePassed,
      true
    );

    assert.equal(
      speciesCalls,
      0
    );
  }
);

test(
  "rejected cross-realm and subclass generator Promises do not leak unhandled rejections",
  async () => {
    class CustomPromise
      extends Promise {}

    const rejectedFactories = [
      () =>
        vm.runInNewContext(
          `Promise.reject(
            new Error("foreign rejection")
          )`
        ),

      () =>
        new CustomPromise(
          (
            _resolve,
            reject
          ) =>
            reject(
              new Error(
                "subclass rejection"
              )
            )
        )
    ];

    for (
      const createRejected of
        rejectedFactories
    ) {
      const unhandled =
        await captureUnhandled(
          async () => {
            const value =
              createRejected();

            await assert.rejects(
              runContractAttacks(
                makeOptions({
                  generator() {
                    return value;
                  }
                })
              ),
              /rejection/
            );
          }
        );

      assert.equal(
        unhandled,
        null
      );
    }
  }
);

test(
  "shadowed Promise constructor and then hooks are bypassed safely",
  async () => {
    let constructorGetterCalls = 0;
    let thenGetterCalls = 0;

    const value =
      Promise.reject(
        new Error(
          "shadowed rejection"
        )
      );

    Object.defineProperty(
      value,
      "constructor",
      {
        configurable: true,

        get() {
          constructorGetterCalls += 1;
          throw new Error(
            "constructor getter executed"
          );
        }
      }
    );

    Object.defineProperty(
      value,
      "then",
      {
        configurable: true,

        get() {
          thenGetterCalls += 1;
          throw new Error(
            "then getter executed"
          );
        }
      }
    );

    const unhandled =
      await captureUnhandled(
        async () => {
          await assert.rejects(
            runContractAttacks(
              makeOptions({
                generator() {
                  return value;
                }
              })
            ),
            /shadowed rejection/
          );
        }
      );

    assert.equal(
      unhandled,
      null
    );

    assert.equal(
      constructorGetterCalls,
      0
    );

    assert.equal(
      thenGetterCalls,
      0
    );
  }
);

test(
  "M8 package entry point exposes runContractAttacks",
  () => {
    const publicApi =
      require("../src");

    const internal =
      require(
        "../src/contract-attacks"
      );

    assert.equal(
      publicApi.runContractAttacks,
      internal.runContractAttacks
    );
  }
);
