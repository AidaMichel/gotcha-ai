"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  runContractAttacks
} = require("../src/contract-attacks");

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

function makeOptions(overrides = {}) {
  const contract = makeContract();

  return {
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
  "experiment seed capture does not execute a Proxy prototype trap",
  async () => {
    let trapCalls = 0;
    const expectedOutput = [];
    const proxyPrototype = new Proxy(
      Array.prototype,
      {
        getPrototypeOf(target) {
          trapCalls += 1;
          return Reflect.getPrototypeOf(target);
        }
      }
    );

    Object.setPrototypeOf(
      expectedOutput,
      proxyPrototype
    );

    await assert.rejects(
      () =>
        runContractAttacks(
          makeOptions({
            expectedOutput
          })
        )
    );

    assert.equal(trapCalls, 0);
  }
);

test(
  "experiment validation uses captured Set methods",
  async () => {
    const previousHas = Set.prototype.has;
    const previousAdd = Set.prototype.add;

    Set.prototype.has = function tamperedHas() {
      return true;
    };

    Set.prototype.add = function tamperedAdd() {
      throw new Error(
        "dynamic Set.prototype.add must not run"
      );
    };

    try {
      const result = await runContractAttacks(
        makeOptions()
      );

      assert.equal(
        result.experiment.replayable,
        true
      );
    } finally {
      Set.prototype.has = previousHas;
      Set.prototype.add = previousAdd;
    }
  }
);
