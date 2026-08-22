"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { runContractAttacks } = require("../src");

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

async function runBorrowedCase(harden) {
  const contextA = vm.createContext({});
  const contextB = vm.createContext({});
  const setup = harden
    ? "Object.freeze(Object); Object.freeze(Array);"
    : "";

  const a = vm.runInContext(
    `${setup} [1, 2]`,
    contextA
  );
  const b = vm.runInContext(
    `${setup} [3, 4]`,
    contextB
  );
  const ArrayA = vm.runInContext("Array", contextA);
  const ArrayB = vm.runInContext("Array", contextB);

  const nativeFromA =
    a.map.call(b, (value) => value);
  const nativeFromB =
    b.map.call(a, (value) => value);

  assert.equal(nativeFromA instanceof ArrayA, true);
  assert.equal(nativeFromA instanceof ArrayB, false);
  assert.equal(nativeFromB instanceof ArrayB, true);
  assert.equal(nativeFromB instanceof ArrayA, false);

  let generatorCalled = false;
  const confirmed = contract();
  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: { a, b },
    evaluator(output) {
      const fromA =
        output.a.map.call(
          output.b,
          (value) => value
        );
      const fromB =
        output.b.map.call(
          output.a,
          (value) => value
        );

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

  assert.equal(result.baselinePassed, true);
  assert.equal(generatorCalled, true);
}

test("borrowed safe array methods preserve the method realm", async () => {
  await runBorrowedCase(false);
  await runBorrowedCase(true);
});

test("borrowing local and foreign safe methods preserves the method realm", async () => {
  const context = vm.createContext({});
  const foreign = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); [1, 2]",
    context
  );
  const ForeignArray = vm.runInContext("Array", context);
  const local = [3, 4];
  const confirmed = contract();

  const result = await runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput: { local, foreign },
    evaluator(output) {
      const localMethodResult =
        output.local.map.call(
          output.foreign,
          (value) => value
        );
      const foreignMethodResult =
        output.foreign.map.call(
          output.local,
          (value) => value
        );

      return (
        localMethodResult instanceof Array &&
        !(localMethodResult instanceof ForeignArray) &&
        foreignMethodResult instanceof ForeignArray &&
        !(foreignMethodResult instanceof Array)
      );
    },
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: []
      };
    }
  });

  assert.equal(result.baselinePassed, true);
});
