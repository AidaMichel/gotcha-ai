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

test("native forEach collisions fail foreign intrinsic authentication", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Array.prototype.forEach = Map.prototype.forEach;
    Object.freeze(Object);
    Object.freeze(Array);
    ["approved"];
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

test("foreign Function.prototype getters stay behind detached method shadows", async () => {
  const context = vm.createContext({ getterCalls: 0 });
  const expectedOutput = vm.runInContext(`
    Object.defineProperty(Function.prototype, "evil", {
      configurable: true,
      get() {
        getterCalls += 1;
        return "foreign evil";
      }
    });
    Object.freeze(Object);
    Object.freeze(Array);
    ["approved"];
  `, context);
  const ForeignArray = vm.runInContext("Array", context);

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput,
    evaluator(output) {
      return (
        output instanceof ForeignArray &&
        typeof output.map === "function" &&
        output.map.evil === undefined &&
        output.map((value) => value)[0] === "approved"
      );
    },
    generator() {
      generatorCalled = true;
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(generatorCalled, true);
  assert.equal(vm.runInContext("getterCalls", context), 0);
});

test("nested unscopables mutations are restored through async settlement", async () => {
  const unscopables = Array.prototype[Symbol.unscopables];
  const key = "__gotcha_round12__";
  assert.equal(Object.prototype.hasOwnProperty.call(unscopables, key), false);

  const result = await runContractAttacks(options({
    async generator() {
      await Promise.resolve();
      Object.defineProperty(unscopables, key, {
        value: true,
        writable: true,
        enumerable: true,
        configurable: true
      });
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(unscopables, key), false);
});

test("local instanceof stays false for exact foreign snapshot nodes", async () => {
  const context = vm.createContext({});
  const foreignObject = vm.runInContext("({ value: 'approved' })", context);
  const foreignArray = vm.runInContext("['approved']", context);
  const ForeignObject = vm.runInContext("Object", context);
  const ForeignArray = vm.runInContext("Array", context);

  let generatorCalled = false;
  const result = await runContractAttacks(options({
    expectedOutput: {
      foreignObject,
      foreignArray,
      localObject: { value: "approved" },
      localArray: ["approved"]
    },
    evaluator(output) {
      return (
        !(output.foreignObject instanceof Object) &&
        !(output.foreignArray instanceof Array) &&
        output.localObject instanceof Object &&
        output.localArray instanceof Array &&
        output.foreignObject instanceof ForeignObject &&
        output.foreignArray instanceof ForeignArray
      );
    },
    generator() {
      generatorCalled = true;
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(generatorCalled, true);
});

test("shared intrinsic method own properties are restored", async () => {
  const key = "__gotcha_round12_method__";
  const map = Array.prototype.map;
  assert.equal(Object.prototype.hasOwnProperty.call(map, key), false);

  const result = await runContractAttacks(options({
    generator() {
      Object.defineProperty(map, key, {
        value: 1,
        writable: true,
        enumerable: true,
        configurable: true
      });
      return emptyGenerator();
    }
  }));

  assert.equal(result.baselinePassed, true);
  assert.equal(Object.prototype.hasOwnProperty.call(map, key), false);
});
