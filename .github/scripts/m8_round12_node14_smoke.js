"use strict";

const assert = require("assert");
const vm = require("vm");
const { runContractAttacks } = require("../../src");

function contract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved value.",
    rules: [{
      id: "value-rule",
      statement: "Return the approved value.",
      kind: "required",
      severity: "critical"
    }]
  };
}

function emptyGenerator() {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: []
  };
}

(async () => {
  const context = vm.createContext({ getterCalls: 0 });
  const foreignObject = vm.runInContext("({ value: 'approved' })", context);
  const foreignArray = vm.runInContext(`
    Object.defineProperty(Function.prototype, "evil", {
      configurable: true,
      get() {
        getterCalls += 1;
        return "evil";
      }
    });
    Object.freeze(Object);
    Object.freeze(Array);
    ["approved"];
  `, context);
  const ForeignObject = vm.runInContext("Object", context);
  const ForeignArray = vm.runInContext("Array", context);

  const unscopables = Array.prototype[Symbol.unscopables];
  const unscopablesKey = "__gotcha_round12_node14__";

  const result = await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: {
      foreignObject,
      foreignArray,
      local: { value: "approved" }
    },
    evaluator(output) {
      return (
        !(output.foreignObject instanceof Object) &&
        output.foreignObject instanceof ForeignObject &&
        !(output.foreignArray instanceof Array) &&
        output.foreignArray instanceof ForeignArray &&
        output.local instanceof Object &&
        output.foreignArray.map.evil === undefined
      );
    },
    async generator() {
      await Promise.resolve();
      Object.defineProperty(unscopables, unscopablesKey, {
        value: true,
        configurable: true
      });
      return emptyGenerator();
    }
  });

  assert.strictEqual(result.baselinePassed, true);
  assert.strictEqual(vm.runInContext("getterCalls", context), 0);
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(unscopables, unscopablesKey),
    false
  );

  console.log("Round 12 Node 14 smoke PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
