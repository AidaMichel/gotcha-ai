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

async function main() {
  const iteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]());
  const originalNext = iteratorPrototype.next;

  const result = await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator() {
      iteratorPrototype.next = () => ({ value: undefined, done: true });
      return {
        version: 1,
        task: "Return the approved value.",
        attacks: [{
          id: "node14",
          ruleId: "value-rule",
          type: "wrong-value",
          description: "Changes the approved value.",
          rationale: "Proposed violation.",
          mutatedOutput: { value: "wrong" },
          scores: { realism: 1, subtlety: 1, novelty: 1, fixability: 1 }
        }]
      };
    }
  });

  assert.strictEqual(iteratorPrototype.next, originalNext);
  assert.ok(result.topFinding);

  const nullPrototype = Object.create(null);
  nullPrototype.value = "approved";
  let nullGeneratorCalled = false;
  await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: nullPrototype,
    evaluator: (output) => !(output instanceof Object),
    generator() {
      nullGeneratorCalled = true;
      return { version: 1, task: "Return the approved value.", attacks: [] };
    }
  });
  assert.strictEqual(nullGeneratorCalled, true);

  const context = vm.createContext({});
  const expected = vm.runInContext(
    "Object.freeze(Array); Object.freeze(Object); [1, 2]",
    context
  );
  const evaluator = vm.runInContext(
    "(output) => output instanceof Array",
    context
  );
  let frozenGeneratorCalled = false;
  await runContractAttacks({
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: expected,
    evaluator,
    generator() {
      frozenGeneratorCalled = true;
      return { version: 1, task: "Return the approved value.", attacks: [] };
    }
  });
  assert.strictEqual(frozenGeneratorCalled, true);

  console.log("Node 14 Round 9 smoke PASS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
