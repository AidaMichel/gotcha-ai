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

    for (const value of candidates) {
      Object.setPrototypeOf(
        value,
        Object.prototype
      );

      assert.throws(
        () =>
          cloneAiData(value),
        /unsupported runtime object/
      );
    }
  }
);

test(
  "rejected async evaluators are observed before the deterministic async error is reported",
  async () => {
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
      await assert.rejects(
        runContractAttacks({
          contract:
            makeContract(),

          input: {
            request:
              "Return the time."
          },

          expectedOutput: {
            time: "3 PM"
          },

          async evaluator() {
            throw new Error(
              "evaluator rejection"
            );
          },

          generator() {
            return (
              makeEmptyGeneratorOutput()
            );
          }
        }),
        /Async checks are not supported/
      );

      await new Promise(
        (resolve) =>
          setImmediate(resolve)
      );

      assert.equal(
        unhandled,
        null
      );
    } finally {
      process.removeListener(
        "unhandledRejection",
        onUnhandled
      );
    }
  }
);

test(
  "cross-realm generator Promises remain outside the M8 safe Promise boundary",
  async () => {
    const foreignPromise =
      vm.runInNewContext(
        `Promise.resolve({
          version: 1,
          task: "Return the approved time.",
          attacks: []
        })`
      );

    await assert.rejects(
      runContractAttacks({
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
          return foreignPromise;
        }
      }),
      /standard Promise prototype/
    );
  }
);

test(
  "Promise subclasses remain outside the M8 safe generator Promise boundary",
  async () => {
    class CustomPromise
      extends Promise {}

    const value =
      new CustomPromise(
        (resolve) =>
          resolve(
            makeEmptyGeneratorOutput()
          )
      );

    await assert.rejects(
      runContractAttacks({
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
          return value;
        }
      }),
      /standard Promise prototype/
    );
  }
);
