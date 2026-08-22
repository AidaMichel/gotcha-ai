"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");

const { runContractAttacks } = require("../src");

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

function options(overrides = {}) {
  return {
    contract: contract(),
    input: { request: "approved" },
    expectedOutput: { value: "approved" },
    evaluator: () => true,
    generator: emptyGenerator,
    ...overrides
  };
}

test("mutable foreign instanceof preserves negative and positive per-node provenance", async () => {
  const context = vm.createContext({});
  const foreignObject = vm.runInContext("({ realm: 'foreign' })", context);
  const foreignArray = vm.runInContext("['foreign']", context);
  const ForeignObject = vm.runInContext("Object", context);
  const ForeignArray = vm.runInContext("Array", context);

  const expectedOutput = {
    local: { realm: "local" },
    foreign: foreignObject,
    localArray: ["local"],
    foreignArray
  };

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput,
    evaluator(output) {
      return (
        !(output instanceof ForeignObject) &&
        !(output.local instanceof ForeignObject) &&
        output.foreign instanceof ForeignObject &&
        !(output.localArray instanceof ForeignArray) &&
        output.foreignArray instanceof ForeignArray
      );
    },
    generator() {
      generatorCalled = true;
      return emptyGenerator();
    }
  }));

  assert.equal(generatorCalled, true);
  assert.equal(result.baselinePassed, true);
});

test("frozen foreign prototypes apply only to mapped foreign nodes", async () => {
  const context = vm.createContext({});
  const foreignObject = vm.runInContext(
    "Object.freeze(Object); Object.freeze(Array); ({ realm: 'foreign' })",
    context
  );
  const foreignArray = vm.runInContext("['foreign']", context);
  const ForeignObject = vm.runInContext("Object", context);
  const ForeignArray = vm.runInContext("Array", context);

  const expectedOutput = {
    foreign: foreignObject,
    localArray: ["local"],
    foreignArray
  };

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput,
    evaluator(output) {
      return (
        !(output instanceof ForeignObject) &&
        output.foreign instanceof ForeignObject &&
        !(output.localArray instanceof ForeignArray) &&
        output.foreignArray instanceof ForeignArray
      );
    },
    generator() {
      generatorCalled = true;
      return emptyGenerator();
    }
  }));

  assert.equal(generatorCalled, true);
  assert.equal(result.baselinePassed, true);
});

test("same-named native substitution cannot authenticate a foreign intrinsic surface", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.prototype.toString = Function.prototype.toString;
    Object.freeze(Object);
    ({ value: "approved" });
  `, context);

  let evaluatorCalled = false;
  let generatorCalled = false;

  await assert.rejects(
    runContractAttacks(options({
      expectedOutput,
      evaluator() {
        evaluatorCalled = true;
        return true;
      },
      generator() {
        generatorCalled = true;
        return emptyGenerator();
      }
    })),
    /native intrinsic surfaces/
  );

  assert.equal(evaluatorCalled, false);
  assert.equal(generatorCalled, false);
});

test("Promise.prototype.then is restored after synchronous generator mutation", async () => {
  const originalThen = Promise.prototype.then;

  const result = await runContractAttacks(options({
    generator() {
      Promise.prototype.then = function brokenThen() {
        throw new Error("broken then leaked");
      };
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Promise.prototype.then, originalThen);
  assert.equal(await Promise.resolve(7).then((value) => value), 7);
});

test("Promise.prototype.then is restored after async post-await generator mutation", async () => {
  const originalThen = Promise.prototype.then;

  const result = await runContractAttacks(options({
    async generator() {
      await Promise.resolve();
      Promise.prototype.then = function brokenThen() {
        throw new Error("broken async then leaked");
      };
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Promise.prototype.then, originalThen);
  assert.equal(await Promise.resolve(9).then((value) => value), 9);
});
