"use strict";

const vm = require("node:vm");
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
  const context = vm.createContext({});
  const foreign = vm.runInContext("Object.freeze(Object); ({ x: 1 })", context);
  const ForeignObject = vm.runInContext("Object", context);
  const expectedOutput = { local: { x: 0 }, foreign };

  const result = await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput,
    evaluator(output) {
      return (
        !(output instanceof ForeignObject) &&
        !(output.local instanceof ForeignObject) &&
        output.foreign instanceof ForeignObject
      );
    },
    generator: emptyGenerator
  });

  if (!result.baselinePassed) {
    throw new Error("Round 11 frozen provenance smoke failed");
  }

  const originalThen = Promise.prototype.then;
  const promiseResult = await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator() {
      Promise.prototype.then = function brokenThen() {
        throw new Error("leaked Promise.prototype.then");
      };
      return emptyGenerator();
    }
  });

  if (!promiseResult.baselinePassed || Promise.prototype.then !== originalThen) {
    throw new Error("Round 11 Promise restoration smoke failed");
  }

  console.log("Round 11 Node 14 smoke PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
