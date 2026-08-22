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

function generatedAttack(mutatedOutput) {
  return {
    id: "realm-change",
    ruleId: "value-rule",
    type: "realm-change",
    description: "Changes the approved structured value.",
    rationale: "Exercises evaluator realm semantics.",
    mutatedOutput,
    scores: {
      realism: 0.9,
      subtlety: 0.8,
      novelty: 0.7,
      fixability: 0.9
    }
  };
}

async function runCase(expectedOutput, evaluator, mutatedOutput) {
  const confirmed = contract();
  return runContractAttacks({
    contract: confirmed,
    input: { request: "approved" },
    expectedOutput,
    evaluator,
    generator() {
      return {
        version: 1,
        task: confirmed.task,
        attacks: mutatedOutput === undefined
          ? []
          : [generatedAttack(mutatedOutput)]
      };
    }
  });
}

function makeForeignObjectCase(harden) {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    ${harden ? "Object.freeze(Object); Object.freeze(Array);" : ""}
    ({ ok: true });
  `, context);
  const evaluator = vm.runInContext(`
    (output) => (
      output.items === undefined ||
      (
        output.items instanceof Array &&
        output.items.map((value) => value) instanceof Array
      )
    )
  `, context);
  return { expectedOutput, evaluator };
}

test("generated arrays inherit a foreign object root realm without an expected array sample", async () => {
  for (const harden of [false, true]) {
    const { expectedOutput, evaluator } =
      makeForeignObjectCase(harden);
    const result = await runCase(
      expectedOutput,
      evaluator,
      { ok: false, items: ["changed"] }
    );

    assert.equal(result.baselinePassed, true);
    assert.equal(result.attack.survivors.length, 1);
    assert.notEqual(result.topFinding, null);
  }
});

test("foreign array-producing safe methods preserve evaluator realm semantics", async () => {
  for (const harden of [false, true]) {
    const context = vm.createContext({});
    const expectedOutput = vm.runInContext(`
      ${harden ? "Object.freeze(Object); Object.freeze(Array);" : ""}
      [1, 2];
    `, context);
    const evaluator = vm.runInContext(`
      (output) => {
        const arrays = [
          output.map((value) => value),
          output.filter(() => true),
          output.slice(),
          output.concat([]),
          output.flat(),
          output.flatMap((value) => [value])
        ];
        return arrays.every((value) => value instanceof Array);
      }
    `, context);

    const result = await runCase(
      expectedOutput,
      evaluator,
      undefined
    );

    assert.equal(result.baselinePassed, true);
  }
});

test("local array-producing safe methods preserve local instanceof semantics", async () => {
  const evaluator = (output) => {
    const arrays = [
      output.map((value) => value),
      output.filter(() => true),
      output.slice(),
      output.concat([]),
      output.flat(),
      output.flatMap((value) => [value])
    ];
    return arrays.every((value) => value instanceof Array);
  };

  const result = await runCase(
    [1, 2],
    evaluator,
    undefined
  );

  assert.equal(result.baselinePassed, true);
});

test("derived foreign arrays remain negative for the local Array constructor", async () => {
  const context = vm.createContext({});
  const expectedOutput = vm.runInContext(`
    Object.freeze(Object);
    Object.freeze(Array);
    [1, 2];
  `, context);
  const ForeignArray = vm.runInContext("Array", context);

  const result = await runCase(
    expectedOutput,
    (output) => {
      const mapped = output.map((value) => value);
      return (
        mapped instanceof ForeignArray &&
        !(mapped instanceof Array)
      );
    },
    undefined
  );

  assert.equal(result.baselinePassed, true);
});
