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

function generator() {
  return {
    version: 1,
    task: "Return the approved value.",
    attacks: []
  };
}

(async () => {
  const basic = await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator
  });

  if (!basic.baselinePassed) {
    throw new Error("basic Round 10 smoke failed");
  }

  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(
    "Object.freeze(Object); ({ value: 'approved' })",
    context
  );
  const ForeignObject = vm.runInContext("Object", context);

  const frozenRealm = await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput,
    evaluator: (output) => output instanceof ForeignObject,
    generator
  });

  if (!frozenRealm.baselinePassed) {
    throw new Error("frozen foreign realm smoke failed");
  }

  const unsafeContext = vm.createContext({ getterCalls: 0 });
  const unsafeExpected = vm.runInContext(`
    Object.defineProperty(Object.prototype, "danger", {
      configurable: true,
      get() { getterCalls += 1; return 1; }
    });
    Object.freeze(Object);
    ({ value: "approved" });
  `, unsafeContext);
  let rejected = false;

  try {
    await runContractAttacks({
      contract: contract(),
      input: { request: "approved" },
      expectedOutput: unsafeExpected,
      evaluator: () => true,
      generator
    });
  } catch (error) {
    rejected = /native intrinsic surfaces/.test(String(error && error.message));
  }

  if (!rejected || unsafeContext.getterCalls !== 0) {
    throw new Error("unsafe foreign prototype smoke failed");
  }

  console.log("Round 10 Node 14 smoke PASS");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
