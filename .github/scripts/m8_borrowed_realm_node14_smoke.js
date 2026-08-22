"use strict";

const assert = require("node:assert");
const vm = require("node:vm");
const { runContractAttacks } = require("../../src");

function contract() {
  return {
    version: 1,
    status: "confirmed",
    task: "Return the approved structured value.",
    rules: [{
      id: "value-rule",
      statement: "Return the approved structured value.",
      kind: "required",
      severity: "critical"
    }]
  };
}

(async () => {
  const contextA = vm.createContext({});
  const contextB = vm.createContext({});
  const a = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); [1, 2]",
    contextA
  );
  const b = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); [3, 4]",
    contextB
  );
  const ArrayA = vm.runInContext("Array", contextA);
  const ArrayB = vm.runInContext("Array", contextB);
  const confirmed = contract();
  let generatorCalled = false;

  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: { a, b },
    evaluator(output) {
      const fromA = output.a.map.call(output.b, value => value);
      const fromB = output.b.map.call(output.a, value => value);
      return (
        fromA instanceof ArrayA &&
        !(fromA instanceof ArrayB) &&
        fromB instanceof ArrayB &&
        !(fromB instanceof ArrayA)
      );
    },
    generator() {
      generatorCalled = true;
      return {
        version: 1,
        task: confirmed.task,
        attacks: []
      };
    }
  });

  assert.strictEqual(result.baselinePassed, true);
  assert.strictEqual(generatorCalled, true);
  console.log("Node 14 borrowed-method realm smoke PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
